export default function Alert({ message, type, onClose }) {
  return (
    <div className={`alert alert-${type}`} onClick={onClose}>
      {message}
    </div>
  );
}
