import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      headers: {
        review: "Review",
        notifications: "Notifications",
        deleteAccount: "Delete Account",
        writeReview: "Write Review",
        profile: "Profile",
        chat: "Chat",
      },
      emptyStates: {
        browse: {
          title: "No reviews yet",
          description: "Be the first to share your dating experience in your area",
        },
        chatrooms: {
          title: "No chat rooms found",
          description: "Try adjusting your search",
        },
        notifications: {
          title: "No notifications yet",
          description: "Likes, comments, replies, and chat mentions will appear here.",
        },
        searchPrompt: {
          title: "Search content",
          description: "Enter at least 2 characters and tap the search icon",
        },
        searchEmpty: {
          title: "No content found",
          description: "Try different search terms",
        },
      },
      welcome: "Welcome",
      signIn: "Sign In",
      createAccount: "Create Account",
      appTitle: "Locker Room Talk",
      subtitle: "Anonymous dating insights from real people in your community",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
    },
  },
  es: {
    translation: {
      headers: {
        review: "Revisión",
        notifications: "Notificaciones",
        deleteAccount: "Eliminar Cuenta",
        writeReview: "Escribir Reseña",
        profile: "Perfil",
        chat: "Chat",
      },
      emptyStates: {
        browse: {
          title: "No hay reseñas aún",
          description: "Sé el primero en compartir tu experiencia de citas en tu área",
        },
        chatrooms: {
          title: "No se encontraron salas de chat",
          description: "Intenta ajustar tu búsqueda",
        },
        notifications: {
          title: "No hay notificaciones aún",
          description: "Los likes, comentarios, respuestas y menciones de chat aparecerán aquí.",
        },
        searchPrompt: {
          title: "Buscar contenido",
          description: "Ingresa al menos 2 caracteres y toca el ícono de búsqueda",
        },
        searchEmpty: {
          title: "No se encontró contenido",
          description: "Prueba con términos de búsqueda diferentes",
        },
      },
      welcome: "Bienvenido",
      signIn: "Iniciar Sesión",
      createAccount: "Crear Cuenta",
      appTitle: "Locker Room Talk",
      subtitle: "Perspectivas de citas anónimas de personas reales en tu comunidad",
      termsOfService: "Términos de Servicio",
      privacyPolicy: "Política de Privacidad",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
