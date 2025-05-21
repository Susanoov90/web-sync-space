import Button from "../Button/WelcomeButton"
import "./Welcome.css"

function Welcome() {
    return(
        <>
            <p>Co navigate, Sharing your screens to many person as easy !</p>
            <div className="welcome-buttons">
                <Button content="Create a sharing session" linkTo="/create"/>
                <Button content="Join an existing sharing session" linkTo="/join"/>
            </div>
        </>
    )
}

export default Welcome
