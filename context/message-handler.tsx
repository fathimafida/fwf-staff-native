// src/contexts/MessageHandlerContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  ToastAndroid,
  Linking,
  Platform,
  Keyboard,
  View,
  Text,
  Button,
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { handleHapticFeedback } from "@/utils/haptics-utils";
import SpInAppUpdates, {
  IAUUpdateKind,
  StartUpdateOptions,
  IAUInstallStatus,
} from "sp-react-native-in-app-updates";
import { Camera, CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { OneSignal } from "react-native-onesignal";

type MessageHandlerContextType = {
  handleMessage: (event: { nativeEvent: { data: string } }) => void;
};

const MessageHandlerContext = createContext<
  MessageHandlerContextType | undefined
>(undefined);

export const MessageHandlerProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function getCurrentLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
  }

  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
 const [focusing,setFocusing] = useState(false)
  const [showCamera, setShowCamera] = useState(false);
  const [resourcePath, setResourcePath] = useState([]);
  const openCamera = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== "granted") {
        console.warn("Camera permission not granted.");
        return;
      }
  
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      
      setShowCamera(true);
  
    } catch (error) {
      console.error("Camera Error: ", error);
    }
  };
  
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
        });
        // console.log(photo.uri); // Log the URI or use it elsewhere
      } catch (error) {
        console.error("Failed to capture photo:", error);
      }
    }
  };

  const openAppScheme = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.warn(`App not installed or URL invalid: ${url}`);
        openInBrowser(url);
      }
    } catch (error) {
      console.error(`Failed to open app scheme URL: ${url}`, error);
    }
  };

  const openInBrowser = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error(`Cannot open URL even in browser: ${url}`);
      }
    } catch (error) {
      console.error(`Failed to open URL in browser: ${url}`, error);
    }
  };

  const checkForUpdate = async (): Promise<void> => {
    const inAppUpdates = new SpInAppUpdates(true);

    try {
      const result = await inAppUpdates.checkNeedsUpdate();
      if (result.shouldUpdate) {
        const updateOptions: StartUpdateOptions = {
          updateType: IAUUpdateKind.IMMEDIATE,
        };

        inAppUpdates.addStatusUpdateListener((status) => {
          if (status.status === IAUInstallStatus.DOWNLOADED) {
            inAppUpdates.installUpdate();
          }
        });

        await inAppUpdates.startUpdate(updateOptions);
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    }
  };

  useEffect(() => {
    if (Platform.OS === "android") {
      checkForUpdate();
    }
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const message = JSON.parse(event.nativeEvent.data) as GeneralEvent;
      console.log("Received message:", message);

      switch (message.type) {
        case "haptic":
          handleHapticFeedback(message);
          break;
        case "console_log":
          console.log(message.data);
          break;
        case "alert":
          alert(message.data);
          break;
        case "keyboard_unfocus":
          Keyboard.dismiss();
          console.log("Keyboard dismissed");
          break;
        case "contact_support":
          const phoneNumber =
            Platform.OS === "android"
              ? `tel:${message.data}`
              : `tel:${message.data}`;
          Linking.openURL(phoneNumber);
          break;
        case "request_location":
          getCurrentLocation();
          break;
        case "request_camera_permission":
          requestPermission();
          break;
        case "open_camera":
          openCamera();
          break;

        case "onesignal_login":
          OneSignal.login(message.data);
          break;

        case "onsignal_logout":
          OneSignal.logout();
          break;

        case "open_app_scheme":
          openAppScheme(message.data);
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    },
    []
  );

  return (
    <MessageHandlerContext.Provider value={{ handleMessage }}>
      {/* Camera View */}
      {/* {showCamera && (
  <View style={{ flex: 1 }}>
    <CameraView
      ref={cameraRef}
      style={{ width: "100%", height: "100%" }}
      facing={facing}
      
      onTouchStart={() => setFocusing(true)}
      onTouchEnd={() => setFocusing(false)}
    >
    </CameraView>


    <TouchableOpacity
      onPress={() => setFacing((prev) => (prev === "back" ? "front" : "back"))}
      style={{
        position: 'absolute',
        bottom: 40,
        right: 20,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 30,
        elevation: 10,
      }}
    >
      <Text>🔄</Text>
    </TouchableOpacity>

  </View>


      )} */}

      {/* Render children */}
      {children}
    </MessageHandlerContext.Provider>
  );
};

export const useMessageHandler = () => {
  const context = useContext(MessageHandlerContext);
  if (!context) {
    throw new Error(
      "useMessageHandler must be used within a MessageHandlerProvider"
    );
  }
  return context;
};
