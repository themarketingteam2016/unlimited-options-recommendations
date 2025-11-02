import { useEffect } from 'react';
import styles from './Toast.module.css';

export default function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (message && duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.toastIcon}>
        {icons[type] || icons.info}
      </div>
      <div className={styles.toastText}>{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className={styles.toastClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
}
