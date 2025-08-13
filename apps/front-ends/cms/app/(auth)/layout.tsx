import styles from './styles.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.contentContainer}>
        {children}
      </div>
    </div>
  );
}
