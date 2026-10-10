package vn.syp.tms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "vn.syp.tms", considerNestedRepositories = true)
public class JpaRepositoryConfig {}
