import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  phoneNumber: string;
  // Add other user properties as needed
}

interface GlobalContextType {
  isLogged: boolean;
  setIsLogged: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const storedUser = await AsyncStorage.getItem("userInfo");
          const role = await AsyncStorage.getItem("role");
          if (role === "user") {
            router.replace("/home" as any);
          }
          if (role === "owner") {
            router.replace("/owner-home" as any);
          }
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setIsLogged(true);
            setUser(userData);
          } else {
            setIsLogged(false);
            setUser(null);
          }
        } catch (error) {
          console.error("Failed to load user data:", error);
          setIsLogged(false);
          setUser(null);
        } finally {
          setLoading(false);
        }
      };
      loadUserData();
    }, [])
  );

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
