import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './src/app/navigation/router';

// Initialize polyfills
require("./src/app/config/polyfills/index");

function App() {
  return <RouterProvider router={router} />;
}

registerRootComponent(App);
