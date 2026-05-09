import './TitleScene.scss'

import * as Analytics from '../analytics'

import React, { MouseEvent, useContext, useState } from 'react'
import { lastSeenVersion, optionsSlice } from '../entities/Options'
import { useDispatch, useSelector } from 'react-redux'

import AboutScene from './AboutScene'
import ChangelogPanel from './ChangelogPanel'
import HomePage from 'bemuse/site/HomePage'
import ModalPopup from 'bemuse/ui/ModalPopup'
import ModeSelectScene from './ModeSelectScene'
import Scene from 'bemuse/ui/Scene'
import { SceneManagerContext } from 'bemuse/scene-manager'
import Toolbar from './Toolbar'
import { selectOptions } from '../redux/ReduxState'
import version from 'bemuse/utils/version'
import SDKMusicSelectScene from './SDKMusicSelectScene'

const HAS_PARENT = (() => {
  try {
    return window.parent !== window
  } catch (e) {
    return false
  }
})()

const Version = () => (
  <>
    <strong>Bemuse</strong> v{version}
  </>
)

const toolbarItems = ({
  showAbout,
  viewChangelog,
  hasSeenChangelog,
}: {
  showAbout: (e: MouseEvent<HTMLAnchorElement>) => void
  viewChangelog: (e: MouseEvent<HTMLAnchorElement>) => void
  hasSeenChangelog: boolean
}) => [
  Toolbar.item('About', {
    onClick: showAbout,
  }),
  Toolbar.item('Community FAQ', {
    href: 'https://faq.bemuse.ninja',
    tip: 'New',
    tipFeatureKey: 'faq',
  }),
  Toolbar.item('Docs', {
    href: '/project/',
  }),
  Toolbar.item(<Version />, {
    onClick: viewChangelog,
    tip: 'What’s new?',
    tipVisible: !hasSeenChangelog,
  }),
  Toolbar.spacer(),
  Toolbar.item('Discord', {
    href: 'https://discord.gg/aB6ucmx',
    tip: 'Join our community',
    tipFeatureKey: 'discord',
  }),
  Toolbar.item('Twitter', {
    href: 'https://twitter.com/bemusegame',
  }),
  Toolbar.item('GitHub', {
    href: 'https://github.com/bemusic/bemuse',
  }),
]

const TitleScene = () => {
  const sceneManager = useContext(SceneManagerContext)
  const dispatch = useDispatch()
  const options = useSelector(selectOptions)

  const onMarkChangelogAsSeen = () => {
    dispatch(
      optionsSlice.actions.UPDATE_LAST_SEEN_VERSION({ newVersion: version })
    )
  }

  const hasSeenChangelog = lastSeenVersion(options) === version

  const [changelogModalVisible, setChangelogModalVisible] = useState(false)

  const enterGame = () => {
    sceneManager.push(<ModeSelectScene />)
    Analytics.send('TitleScene', 'enter game')
  }

  const enterSdkMode = () => {
    sceneManager.push(<SDKMusicSelectScene />)
    Analytics.send('TitleScene', 'enter sdk mode')
  }

  const showAbout = () => {
    sceneManager.push(<AboutScene />)
    Analytics.send('TitleScene', 'show about')
  }

  const viewChangelog = () => {
    toggleChangelogModal()
    onMarkChangelogAsSeen()
    Analytics.send('TitleScene', 'view changelog')
  }

  const toggleChangelogModal = () => {
    setChangelogModalVisible((flag) => !flag)
  }

  const shouldShowHomepage = !HAS_PARENT
  return (
    <Scene className='TitleScene'>
      <div className='TitleSceneのimage' />
      <div className='TitleSceneのpage'>
        <div className='TitleSceneのpageTitle'>
          <div className='TitleSceneのlogo'>
            <div className='TitleSceneのtagline'>
              online, web-based rhythm game
            </div>
            <img src={require('./images/logo-with-shadow.svg')} />
          </div>
          <div className='TitleSceneのenter'>
            <div className='TitleSceneのmode' onClick={enterGame} data-testid='enter-game'>
              <div className='TitleSceneのmodeTitle'>
                Classic Mode
              </div>
              <div className='TitleSceneのmodeDesc'>
                Play BMS beatmaps from music servers
              </div>
            </div>
            <div className='TitleSceneのmode' onClick={enterSdkMode} data-testid='enter-sdk-mode'>
              <div className='TitleSceneのmodeTitle'>
                ▶ MusicStream
              </div>
              <div className='TitleSceneのmodeDesc'>
                Auto-generated charts from synced lyrics
              </div>
            </div>
          </div>
        </div>
        {shouldShowHomepage ? (
          <div className='TitleSceneのpageContents'>
            <HomePage />
          </div>
        ) : null}
      </div>
      <Toolbar
        items={toolbarItems({ hasSeenChangelog, showAbout, viewChangelog })}
      />
      <div className='TitleSceneのcurtain' />
      <ModalPopup
        visible={changelogModalVisible}
        onBackdropClick={() => toggleChangelogModal()}
      >
        <ChangelogPanel />
      </ModalPopup>
    </Scene>
  )
}

export default TitleScene
