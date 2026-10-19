package vn.syp.tms.shared.search;

import java.text.Normalizer;
import java.util.*;

/** Literal AND-token search shared by scoped list queries. SQL expressions are source-owned, never request input. */
public final class MultiWordSearch {
    private MultiWordSearch() {}

    public static List<String> tokens(String keyword) {
        String folded=Normalizer.normalize(Objects.toString(keyword,""),Normalizer.Form.NFD)
            .replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replace('đ','d').replaceAll("(?U)\\s+"," ").strip();
        return folded.isEmpty()?List.of():Arrays.stream(folded.split("(?U)\\s+")).distinct().toList();
    }

    public record Clause(String sql,List<Object> args) {
        public Clause { args=List.copyOf(args); }
    }

    /** Append sql to an existing WHERE; append args before LIMIT/OFFSET. Use the same Clause for rows and count. */
    public static Clause sql(String keyword,String... fields) {
        if(fields.length==0)throw new IllegalArgumentException("Search requires approved fields");
        var sql=new StringBuilder();var args=new ArrayList<Object>();
        for(String token:tokens(keyword)) {
            var alternatives=new ArrayList<String>();
            for(String field:fields) {
                // LIKE's accent collation does not skip NFD combining marks between letters.
                // ICU Unicode marks are removed before matching; CHAR avoids SQL-mode backslash escaping.
                String folded="REGEXP_REPLACE(CONVERT(COALESCE("+field+",'') USING utf8mb4),CONCAT(CHAR(92 USING utf8mb4),'p{M}'),'')";
                alternatives.add("REPLACE(REPLACE("+folded+",_utf8mb4'Đ',_utf8mb4'D'),_utf8mb4'đ',_utf8mb4'd') COLLATE utf8mb4_0900_ai_ci LIKE CONVERT(? USING utf8mb4) COLLATE utf8mb4_0900_ai_ci ESCAPE '!'");
                args.add("%"+token.replace("!","!!").replace("%","!%").replace("_","!_")+"%");
            }
            sql.append(" AND (").append(String.join(" OR ",alternatives)).append(")");
        }
        return new Clause(sql.toString(),args);
    }
}
