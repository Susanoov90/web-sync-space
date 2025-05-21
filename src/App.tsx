import './App.css'
import Welcome from './Popups/Welcome'
import { Route, Routes } from 'react-router-dom'
import JoinSession from './Popups/JoinSession'
import CreateSession from './Popups/CreateSession'

function App() {
  return (
      <Routes>
        <Route index element={<Welcome />}/>
        <Route path='/join' element={<JoinSession />}/>
        <Route path='/create' element={<CreateSession />} />
      </Routes>
  )
}

export default App
