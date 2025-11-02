import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ size = 'medium', text = '' }) {
  const sizeClass = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large
  }[size];

  return (
    <div className={styles.container}>
      <div className={`${styles.spinner} ${sizeClass}`}>
        <div className={styles.bounce1}></div>
        <div className={styles.bounce2}></div>
        <div className={styles.bounce3}></div>
      </div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}
