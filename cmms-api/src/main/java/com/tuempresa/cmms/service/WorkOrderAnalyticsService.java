package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.analytics.*;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderStatusHistory;
import com.tuempresa.cmms.model.entity.WorkOrderTimeLog;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.repository.WorkOrderStatusHistoryRepository;
import com.tuempresa.cmms.repository.WorkOrderTimeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Igual formulas que WOAnalyticsController real de Atlas (verificado linea
 * por linea): compliant = sin fecha de vencimiento o completada antes de esa
 * fecha; MTTA = horas promedio entre creada y "firstReactedAt" (primera vez
 * que alguien la toco); avgCycleTime = dias promedio entre creada (o la
 * solicitud de origen, si nacio de una) y completada.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderAnalyticsService {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderTimeLogRepository workOrderTimeLogRepository;
    private final WorkOrderStatusHistoryRepository statusHistoryRepository;

    @Transactional(readOnly = true)
    public WOStatsResponse getOverview(DateRangeRequest range) {
        List<WorkOrder> workOrders = workOrderRepository.findByCreatedAtBetween(range.start(), range.end());
        List<WorkOrder> completed = workOrders.stream().filter(w -> w.getStatus() == WorkOrderStatus.COMPLETED).toList();
        List<WorkOrder> withReaction = workOrders.stream().filter(w -> w.getFirstReactedAt() != null).toList();

        int compliant = (int) completed.stream().filter(this::isCompliant).count();
        long mtta = withReaction.isEmpty() ? 0 : withReaction.stream()
                .mapToLong(w -> ChronoUnit.HOURS.between(w.getCreatedAt(), w.getFirstReactedAt())).sum() / withReaction.size();
        long avgCycleTime = averageAgeDays(completed);

        return new WOStatsResponse(workOrders.size(), completed.size(), compliant, avgCycleTime, mtta);
    }

    private boolean isCompliant(WorkOrder wo) {
        return wo.getDueDate() == null || (wo.getCompletedAt() != null && wo.getCompletedAt().isBefore(wo.getDueDate()));
    }

    private long averageAgeDays(List<WorkOrder> completed) {
        List<Long> days = completed.stream()
                .filter(w -> w.getCompletedAt() != null)
                .map(w -> {
                    Instant anchor = w.getParentRequest() != null ? w.getParentRequest().getCreatedAt() : w.getCreatedAt();
                    return ChronoUnit.DAYS.between(anchor, w.getCompletedAt());
                }).toList();
        return days.isEmpty() ? 0 : days.stream().mapToLong(Long::longValue).sum() / days.size();
    }

    @Transactional(readOnly = true)
    public WOStatusesResponse getStatuses(DateRangeRequest range) {
        List<WorkOrder> workOrders = workOrderRepository.findByCreatedAtBetween(range.start(), range.end());
        return countStatuses(workOrders);
    }

    private WOStatusesResponse countStatuses(List<WorkOrder> workOrders) {
        int open = 0, onHold = 0, inProgress = 0, complete = 0;
        for (WorkOrder w : workOrders) {
            switch (w.getStatus()) {
                case OPEN -> open++;
                case ON_HOLD -> onHold++;
                case IN_PROGRESS -> inProgress++;
                case COMPLETED -> complete++;
            }
        }
        return new WOStatusesResponse(open, onHold, inProgress, complete);
    }

    @Transactional(readOnly = true)
    public WOIncompleteStatsResponse getIncompleteOverview(DateRangeRequest range) {
        List<WorkOrder> workOrders = workOrderRepository.findByCreatedAtBetween(range.start(), range.end());
        List<WorkOrder> incomplete = workOrders.stream().filter(w -> w.getStatus() != WorkOrderStatus.COMPLETED).toList();
        Instant now = Instant.now();
        List<Long> ages = incomplete.stream().map(w -> ChronoUnit.DAYS.between(w.getCreatedAt(), now)).toList();
        int avgAge = ages.isEmpty() ? 0 : (int) (ages.stream().mapToLong(Long::longValue).sum() / ages.size());
        return new WOIncompleteStatsResponse(incomplete.size(), avgAge);
    }

    /** Igual formula que getIncompleteByPriority real: conteo + horas estimadas, por cada nivel de prioridad, solo sobre ordenes sin completar. */
    @Transactional(readOnly = true)
    public WOStatsByPriorityResponse getIncompleteByPriority(DateRangeRequest range) {
        List<WorkOrder> workOrders = workOrderRepository.findByCreatedAtBetween(range.start(), range.end());
        List<WorkOrder> incomplete = workOrders.stream().filter(w -> w.getStatus() != WorkOrderStatus.COMPLETED).toList();

        return new WOStatsByPriorityResponse(
                statsForPriority(incomplete, com.tuempresa.cmms.model.enums.WorkOrderPriority.HIGH),
                statsForPriority(incomplete, com.tuempresa.cmms.model.enums.WorkOrderPriority.MEDIUM),
                statsForPriority(incomplete, com.tuempresa.cmms.model.enums.WorkOrderPriority.LOW),
                statsForPriority(incomplete, com.tuempresa.cmms.model.enums.WorkOrderPriority.NONE)
        );
    }

    private WOStatsByPriorityResponse.PriorityStats statsForPriority(List<WorkOrder> workOrders, com.tuempresa.cmms.model.enums.WorkOrderPriority priority) {
        List<WorkOrder> filtered = workOrders.stream().filter(w -> w.getPriority() == priority).toList();
        double estimatedHours = filtered.stream()
                .mapToDouble(w -> w.getEstimatedDurationMinutes() != null ? w.getEstimatedDurationMinutes() / 60.0 : 0).sum();
        return new WOStatsByPriorityResponse.PriorityStats(filtered.size(), estimatedHours);
    }

    /**
     * Hasta 15 puntos distribuidos parejo en el rango, igual que el real --
     * y ahora reconstruye el estado REAL que tenia cada orden en cada punto
     * historico (via WorkOrderStatusHistory), no su estado actual.
     */
    @Transactional(readOnly = true)
    public List<WOStatusesByDateResponse> getStatusesByDate(DateRangeRequest range) {
        List<WOStatusesByDateResponse> result = new ArrayList<>();
        // Igual que el real: el rango es inclusivo de ambos extremos (+1 dia).
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(range.start(), range.end()) + 1);
        int points = (int) Math.min(15, totalDays);
        Instant current = range.start();

        for (int i = 0; i < points; i++) {
            Instant next = current.plus(totalDays / points, ChronoUnit.DAYS);
            if (next.isAfter(range.end())) next = range.end();

            List<WorkOrder> existingByThen = workOrderRepository.findByCreatedAtBetween(range.start(), next);
            int open = 0, onHold = 0, inProgress = 0, complete = 0;
            for (WorkOrder wo : existingByThen) {
                WorkOrderStatus statusAtThen = statusHistoryRepository.findFirstLatestAsOf(wo.getId(), next)
                        .map(WorkOrderStatusHistory::getStatus)
                        .orElse(WorkOrderStatus.OPEN); // sin historial registrado todavia -> asumimos su estado inicial
                switch (statusAtThen) {
                    case OPEN -> open++;
                    case ON_HOLD -> onHold++;
                    case IN_PROGRESS -> inProgress++;
                    case COMPLETED -> complete++;
                }
            }
            result.add(new WOStatusesByDateResponse(next, open, onHold, inProgress, complete));
            current = next;
        }
        return result;
    }

    @Transactional(readOnly = true)
    public WOHoursResponse getHours(DateRangeRequest range) {
        List<WorkOrder> workOrders = workOrderRepository.findByCreatedAtBetween(range.start(), range.end());
        double estimated = workOrders.stream()
                .mapToDouble(w -> w.getEstimatedDurationMinutes() != null ? w.getEstimatedDurationMinutes() / 60.0 : 0).sum();

        double actual = 0;
        for (WorkOrder wo : workOrders) {
            List<WorkOrderTimeLog> logs = workOrderTimeLogRepository.findByWorkOrderId(wo.getId());
            actual += logs.stream().mapToDouble(l -> l.getHours() != null ? l.getHours() : 0).sum();
        }
        return new WOHoursResponse(estimated, actual);
    }
}
