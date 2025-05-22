import './App.css'
import Welcome from './Popups/Welcome'
import { Route, Routes } from 'react-router-dom'
import JoinSession from './Popups/JoinSession'
import CreateSession from './Popups/SessionCreated'
import BridgeToCreateSession from './Popups/BridgeToCreateSession'

function App() {
  return (
      <Routes>
        <Route index element={<Welcome />}/>
        <Route path='/join-session' element={<JoinSession />}/>
        <Route path='/create-session' element ={<BridgeToCreateSession/>} />
        <Route path='/created' element={<CreateSession />} />
      </Routes>
  )
}

export default App
