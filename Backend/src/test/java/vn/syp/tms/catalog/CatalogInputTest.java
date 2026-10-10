package vn.syp.tms.catalog;

import static org.assertj.core.api.Assertions.*;
import java.util.Map;
import jakarta.validation.Validation;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class CatalogInputTest {
    @Test void validatesConvertedDtoAndRejectsNullMalformedAndBlankInputs() {
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var input=new CatalogInput(new ObjectMapper(),factory.getValidator());
            assertThat(input.convert(Map.of("code","QA","name","QA"),CatalogDtos.CreateEnvironment.class).code()).isEqualTo("QA");
            for(Object body:new Object[]{null,Map.of(),Map.of("code","","name","QA"),Map.of("code",Map.of("bad",true),"name","QA")})
                assertThatThrownBy(()->input.convert(body,CatalogDtos.CreateEnvironment.class)).isInstanceOfSatisfying(BusinessException.class,e->{
                    assertThat(e.status()).isEqualTo(422);assertThat(e.code()).isEqualTo("INVALID_CATALOG_INPUT");
                });
        }
    }
}
