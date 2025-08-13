import styles from './auth.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authContainer}>
      {/* Animated background elements for liquid glass effect */}
      <div className={`${styles.liquidOrbs} liquid-glass-bg`} />
      
      <div className={styles.textureOverlay} />
      
      {/* Main content container with liquid glass effect */}
      <div className={styles.contentContainer}>
        {children}
      </div>
    </div>
  );
}
