import { useState, useCallback } from 'react'
import { api } from './utils/api'
import { saveToLocal, addToStoryList, ensureShelves, getAllLocalStories } from './utils/storage'
import Particles from './components/Particles'
import WelcomeScreen from './components/WelcomeScreen'
import JourneyScreen from './components/JourneyScreen'
import ReaderScreen from './components/ReaderScreen'
import ComposeScreen from './components/ComposeScreen'

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [journeyProps, setJourneyProps] = useState(null)
  const [readerProps, setReaderProps] = useState(null)
  const [composeProps, setComposeProps] = useState(null)

  const goHome = useCallback(() => {
    setScreen('welcome')
    setJourneyProps(null)
    setReaderProps(null)
    setComposeProps(null)
  }, [])

  const handleStartGuided = useCallback(async (name, shelfId) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    saveToLocal({ personId, storyId, personName: name })
    addToStoryList({ personId, storyId, personName: name, shelfId })

    setJourneyProps({ personName: name, storyId, initialAnswers: {} })
    setScreen('journey')
  }, [])

  const handleStartFreeform = useCallback(async (name, shelfId) => {
    const result = await api('POST', '/api/persons', { name, age_group: '' })
    const personId = result.person_id
    const storyId = result.story_id

    addToStoryList({ personId, storyId, personName: name, type: 'freeform', storyTitle: null, shelfId })

    setComposeProps({ personId, storyId, personName: name })
    setScreen('compose')
  }, [])

  const handleContinue = useCallback(async (personId, storyId) => {
    const responses = await api('GET', `/api/responses/${storyId}`)
    const answers = {}
    responses.forEach(r => { answers[r.question] = r.answer })

    const stories = getAllLocalStories()
    const entry = stories.find(s => s.personId === personId)
    const personName = entry?.personName || 'You'

    setJourneyProps({ personName, storyId, initialAnswers: answers })
    setScreen('journey')
  }, [])

  const handleOpenCompose = useCallback((personId, storyId, personName) => {
    setComposeProps({ personId, storyId, personName })
    setScreen('compose')
  }, [])

  const handleOpenReader = useCallback((personId, storyId, personName, isFreeform) => {
    setReaderProps({ personId, storyId, personName, isFreeform })
    setScreen('reader')
  }, [])

  return (
    <>
      <Particles />

      {screen === 'welcome' && (
        <WelcomeScreen
          onStartGuided={handleStartGuided}
          onStartFreeform={handleStartFreeform}
          onContinue={handleContinue}
          onOpenCompose={handleOpenCompose}
          onOpenReader={handleOpenReader}
        />
      )}

      {screen === 'journey' && journeyProps && (
        <JourneyScreen
          {...journeyProps}
          onGoHome={goHome}
        />
      )}

      {screen === 'reader' && readerProps && (
        <ReaderScreen
          {...readerProps}
          onGoHome={goHome}
        />
      )}

      {screen === 'compose' && composeProps && (
        <ComposeScreen
          {...composeProps}
          onGoHome={goHome}
          onOpenReader={handleOpenReader}
        />
      )}
    </>
  )
}
