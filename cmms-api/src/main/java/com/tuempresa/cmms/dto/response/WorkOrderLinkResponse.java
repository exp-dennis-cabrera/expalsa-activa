package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.WorkOrderStatus;

public record WorkOrderLinkResponse(Long linkId, Long workOrderId, String title, WorkOrderStatus status) {
}
