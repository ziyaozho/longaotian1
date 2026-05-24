import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import StartScreen from './components/screens/StartScreen';
import CharacterCreate from './components/screens/CharacterCreate';
import SceneSelect from './components/screens/SceneSelect';
import SystemSelect from './components/screens/SystemSelect';
import GameMain from './components/screens/GameMain';
import GameOver from './components/screens/GameOver';
import AchievementPanel from './components/screens/AchievementPanel';
import ParticleBackground from './components/ParticleBackground';
import { DemoProvider } from './demo/DemoContext';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const screen = useGameStore((state) => state.screen);
  const player = usePlayerStore((state) => state.player);

  const renderScreen = () => {
    switch (screen) {
      case 'start':
        return <StartScreen />;
      case 'create':
        return <CharacterCreate />;
      case 'scene_select':
        return <SceneSelect />;
      case 'system_select':
        return <SystemSelect />;
      case 'game':
        return player ? <GameMain /> : <StartScreen />;
      case 'game_over':
        return <GameOver />;
      case 'achievements':
        return <AchievementPanel />;
      default:
        return <StartScreen />;
    }
  };

  return (
    <DemoProvider>
      <div className="min-h-screen paper-bg relative" style={{ color: '#1a1a1a' }}>
        <ParticleBackground />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DemoProvider>
  );
}

export default App;
