package vn.syp.tms.identity;

/** Current account types. Legacy TESTER/DEV values are migrated, never granted at runtime. */
public enum AccountType {
    ADMIN, PM, USER, GUEST;
    public static AccountType fromCode(String code) { return valueOf(code); }
}
