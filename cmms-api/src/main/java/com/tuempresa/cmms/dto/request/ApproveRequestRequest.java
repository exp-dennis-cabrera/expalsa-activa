package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.AssetStatus;

public record ApproveRequestRequest(Long primaryAssigneeId, AssetStatus assetStatus) {
}
