package vn.syp.tms.identity;

import java.io.Serializable;
import java.security.Principal;

public record SessionPrincipal(String id, long version) implements Principal, Serializable {
    private static final long serialVersionUID = 1L;
    @Override public String getName() { return id; }
}
