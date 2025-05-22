import "./WelcomeButton.css";

type ButtonProps = {
  content: string;
  joinCode: string;
  onClick?: () => void; // ➕ pour laisser le parent contrôler le comportement
};

function SubmitButton({ content, onClick }: ButtonProps) {
  return (
    <button className="welcomeLink" onClick={onClick}>
      {content}
    </button>
  );
}

export default SubmitButton;
