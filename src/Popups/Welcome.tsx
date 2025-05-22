import WelcomeButton from "../Button/WelcomeButton"
import "./Welcome.css"

function Welcome() {
    return(
        <>
            <p>Co navigate, Sharing your screens to many person as easy !</p>
            <div className="welcome-buttons">
                <WelcomeButton content="Create a sharing session" linkTo="/create-session"/>
                <WelcomeButton content="Join an existing sharing session" linkTo="/join-session"/>
            </div>
        </>
    )
}

export default Welcome
