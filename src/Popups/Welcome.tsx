import Button from "../Button/WelcomeButton"

function Welcome() {
    return(
        <>
            <p>Co navigate, Sharing your screens to many person as easy !</p>
            <Button content="Create a sharing session" linkTo="/create"/>
            <Button content="Join an existing sharing session" linkTo="/join"/>
        </>
    )
}

export default Welcome
