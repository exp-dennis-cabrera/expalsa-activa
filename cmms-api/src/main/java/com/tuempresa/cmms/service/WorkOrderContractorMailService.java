package com.tuempresa.cmms.service;

import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Vendor;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.mail.MailConfig;
import com.tuempresa.cmms.service.mail.MailConfigResolver;
import com.tuempresa.cmms.service.mail.MailServiceFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Enviar correo a contratistas" real de Atlas: le manda al Vendor asignado
 * un resumen de la orden. Reutiliza la misma infraestructura de correo
 * (MailConfigResolver/MailServiceFactory) que las invitaciones.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderContractorMailService {

    private final WorkOrderRepository workOrderRepository;
    private final MailConfigResolver mailConfigResolver;
    private final MailServiceFactory mailServiceFactory;
    private final CurrentUserProvider currentUser;

    @Transactional(readOnly = true)
    public void sendToContractor(Long workOrderId) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));

        Vendor vendor = wo.getVendor();
        if (vendor == null) {
            throw new ForbiddenOperationException("Esta orden no tiene un contratista asignado.");
        }
        if (vendor.getEmail() == null || vendor.getEmail().isBlank()) {
            throw new ForbiddenOperationException(
                    "El contratista \"" + vendor.getCompanyName() + "\" no tiene un correo configurado.");
        }

        MailConfig config = mailConfigResolver.resolve(currentUser.organizationId());
        if (!config.enabled()) {
            throw new ForbiddenOperationException(
                    "El envio de correo no esta habilitado. Configuralo en Ajustes -> Correo.");
        }

        String subject = "Orden de trabajo: " + wo.getTitle();
        String html = buildHtml(wo);
        mailServiceFactory.getMailService(config.type()).sendHtml(config, vendor.getEmail(), subject, html);
    }

    private String buildHtml(WorkOrder wo) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color:#1e3a5f;">%s</h2>
                    <p>%s</p>
                    <table style="width:100%%; border-collapse: collapse; margin-top: 16px;">
                        <tr><td style="padding:4px 0;color:#888;">Prioridad</td><td>%s</td></tr>
                        <tr><td style="padding:4px 0;color:#888;">Estado</td><td>%s</td></tr>
                        <tr><td style="padding:4px 0;color:#888;">Ubicación</td><td>%s</td></tr>
                        <tr><td style="padding:4px 0;color:#888;">Activo</td><td>%s</td></tr>
                    </table>
                </div>
                """.formatted(
                wo.getTitle(),
                wo.getDescription() != null ? wo.getDescription() : "",
                wo.getPriority(),
                wo.getStatus(),
                wo.getLocation() != null ? wo.getLocation().getName() : "—",
                wo.getAsset() != null ? wo.getAsset().getName() : "—"
        );
    }
}
