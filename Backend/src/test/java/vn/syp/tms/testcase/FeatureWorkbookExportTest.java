package vn.syp.tms.testcase;

import static org.assertj.core.api.Assertions.*;
import java.io.ByteArrayInputStream;
import java.util.*;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class FeatureWorkbookExportTest {
    @Test void writesExactlyThirteenColumnsAndPreservesUnicodeBlankLinesAndLiteralText() throws Exception {
        var cells=new ArrayList<>(Collections.nCopies(13,""));cells.set(0,"001");cells.set(1,"2");cells.set(2,"=literal title");cells.set(4,"Bước 1\n\n選択");cells.set(10,"OK");cells.set(11,"Ticket (0)");cells.set(12,"admin");
        var bytes=FeatureWorkbookExport.write("タブレット",List.of(cells,cells));
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))){var sheet=book.getSheetAt(0);
            assertThat(sheet.getLastRowNum()).isEqualTo(2);assertThat(sheet.getRow(0).getLastCellNum()).isEqualTo((short)13);
            for(int r=1;r<=2;r++)for(int c=0;c<13;c++){
                assertThat(sheet.getRow(r).getCell(c).getCellType()).isEqualTo(CellType.STRING);
                assertThat(sheet.getRow(r).getCell(c).getStringCellValue()).isEqualTo(cells.get(c));
            }
        }
    }
    @Test void refusesRowsThatWouldShiftTheExportColumns(){
        assertThatThrownBy(()->FeatureWorkbookExport.write("Cases",List.of(List.of("1","wrong width")))).isInstanceOf(IllegalArgumentException.class);
    }
}
