import { Card } from "@keystone/ui";
import styles from "./UnauthorizedMessage.module.css";

interface UnauthorizedMessageProps {
  message?: string;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function UnauthorizedMessage({ 
  message = "You don't have permission to access this resource.",
  title = "Access Denied",
  showBackButton = true,
  onBack
}: UnauthorizedMessageProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.icon}>🚫</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        
        {showBackButton && (
          <button 
            onClick={handleBack}
            className={styles.backButton}
          >
            Go Back
          </button>
        )}
      </Card>
    </div>
  );
}
