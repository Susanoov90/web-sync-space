//import { Link } from "react-router-dom"
import "./WelcomeButton.css"

type ButtonProps = {
    content: string,
    joinCode: string
}

function SubmitButton({ content, joinCode }: ButtonProps) {
  const handleJoiningSession = () => {
    if (joinCode === "ABC-132") {
      alert("✅ Bon mot de passe !");
    } else {
      alert("❌ Mauvais mot de passe !");
    }
  };

  return (
    <button className="welcomeLink" onClick={handleJoiningSession}>
      {content}
    </button>
  );
}

export default SubmitButton;