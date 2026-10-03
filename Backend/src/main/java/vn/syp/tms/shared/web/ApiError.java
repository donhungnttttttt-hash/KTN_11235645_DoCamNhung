package vn.syp.tms.shared.web;

import java.util.List;

public record ApiError(String code, String message, List<FieldError> fieldErrors, String requestId) {
    public record FieldError(String field, String code, String message) {}
}

