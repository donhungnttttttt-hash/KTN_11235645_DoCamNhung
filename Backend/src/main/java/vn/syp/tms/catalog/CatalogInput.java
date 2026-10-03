package vn.syp.tms.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;
import vn.syp.tms.shared.web.BusinessException;

/** Dynamic catalog routes must validate the converted DTO, not only the incoming Map. */
@Component
public class CatalogInput {
    private final ObjectMapper mapper;
    private final Validator validator;
    public CatalogInput(ObjectMapper mapper,Validator validator) {this.mapper=mapper;this.validator=validator;}
    public <T> T convert(Object body,Class<T> type) {
        final T value;
        try {value=mapper.convertValue(body,type);}
        catch(IllegalArgumentException e) {throw invalid();}
        if(value==null || !validator.validate(value).isEmpty())throw invalid();
        return value;
    }
    private BusinessException invalid() {return new BusinessException(422,"INVALID_CATALOG_INPUT","Vui lòng kiểm tra các trường bắt buộc và kiểu dữ liệu của danh mục.");}
}
