import { Link } from "react-router-dom"
import "./WelcomeButton.css"

type ButtonProps = {
    content: string,
    linkTo: string
}

function WelcomeButton({content, linkTo} : ButtonProps) {
    return(
    <Link className="welcomeLink" to={linkTo}>
      {content}
    </Link>
    )
}

export default WelcomeButton;