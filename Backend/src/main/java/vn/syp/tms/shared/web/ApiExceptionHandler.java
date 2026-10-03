package vn.syp.tms.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiError> business(BusinessException exception, HttpServletRequest request) {
        return error(exception.status(), exception.code(), exception.getMessage(), request);
    }

    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ApiError> staleWrite(HttpServletRequest request) {
        return error(409, "VERSION_CONFLICT", "Dữ liệu đã thay đổi. Vui lòng tải lại.", request);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> wrongType(HttpServletRequest request) {
        return error(400, "INVALID_REQUEST", "Tham số yêu cầu không hợp lệ.", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        var fields = exception.getBindingResult().getFieldErrors().stream()
                .map(e -> new ApiError.FieldError(e.getField(), "INVALID_VALUE", e.getDefaultMessage())).toList();
        return ResponseEntity.unprocessableEntity().body(new ApiError(
                "VALIDATION_ERROR", "Vui lòng kiểm tra dữ liệu nhập.", fields, requestId(request)));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> invalidJson(HttpServletRequest request) {
        return error(400, "INVALID_REQUEST", "Nội dung yêu cầu không hợp lệ.", request);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> tooLarge(HttpServletRequest request) {
        return error(413, "FILE_TOO_LARGE", "Tệp vượt giới hạn tải lên. Excel tối đa 5 MiB; chứng cứ tối đa 20 MiB.", request);
    }

    @ExceptionHandler({org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    ResponseEntity<ApiError> missingFile(HttpServletRequest request) {
        return error(400, "INVALID_REQUEST", "Thiếu tham số bắt buộc của yêu cầu.", request);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> wrongMethod(org.springframework.web.HttpRequestMethodNotSupportedException exception,
            HttpServletRequest request) {
        var headers = new org.springframework.http.HttpHeaders();
        var methods = exception.getSupportedHttpMethods();
        if (methods != null) headers.setAllow(methods);
        return ResponseEntity.status(405).headers(headers).body(new ApiError(
                "METHOD_NOT_ALLOWED", "Phương thức yêu cầu không được hỗ trợ.", List.of(), requestId(request)));
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> wrongMediaType(HttpServletRequest request) {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "Định dạng nội dung yêu cầu không được hỗ trợ.", request);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    ResponseEntity<ApiError> dataConflict(HttpServletRequest request) {
        return error(409,"DATA_CONFLICT","Dữ liệu bị trùng hoặc đang được tham chiếu. Vui lòng tải lại để đối chiếu.",request);
    }

    @ExceptionHandler({DataAccessException.class, CannotCreateTransactionException.class})
    ResponseEntity<ApiError> databaseUnavailable(Exception exception, HttpServletRequest request) {
        log.warn("Database operation unavailable; requestId={}, type={}", requestId(request), exception.getClass().getSimpleName());
        return error(503, "DATABASE_UNAVAILABLE", "Chưa kết nối được cơ sở dữ liệu. Vui lòng thử lại.", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> notFound(HttpServletRequest request) {
        return error(404, "NOT_FOUND", "Không tìm thấy tài nguyên.", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception exception, HttpServletRequest request) {
        // Do not log payloads, SQL, credentials or internal exception messages.
        log.error("Unexpected request failure; requestId={}, type={}", requestId(request), exception.getClass().getSimpleName());
        return error(500, "INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống. Vui lòng thử lại.", request);
    }

    private ResponseEntity<ApiError> error(int status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ApiError(code, message, List.of(), requestId(request)));
    }

    public static String requestId(HttpServletRequest request) {
        return (String) request.getAttribute(RequestIdFilter.ATTRIBUTE);
    }
}

