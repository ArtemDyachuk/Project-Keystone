import { ThemeSwitcher } from "@/app/components/theme/ThemeSwitcher";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.info}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} Keystone CMS. All rights reserved.
          </span>
        </div>

        <ThemeSwitcher />
      </div>
    </footer>
  );
}
