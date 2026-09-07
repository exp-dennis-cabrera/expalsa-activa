package com.tuempresa.cmms.dto.request;

import java.util.Map;

public record SetCustomFieldValueRequest(Map<Long, String> values) {
}
