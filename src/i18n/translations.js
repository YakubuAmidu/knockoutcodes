// src/i18n/translations.js

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

export const translations = {
  en: {
    // common
    common: {
      save: "Save",
      cancel: "Cancel",
      refresh: "Refresh",
      loading: "Loading…",
      logout: "Logout",
      editProfile: "Edit Profile",
      close: "Close",
      errorGeneric: "Something went wrong. Please try again.",
      networkError: "Network error. Please try again.",
    },

    // profile page
    profile: {
      badge: "Your Profile",
      welcome: "Welcome",
      subtitle:
        "Personal details, brand presence, and account preferences — all in one beautiful place.",

      role: "Role",
      joined: "Joined",
      userId: "User ID",
      notifications: "Notifications",

      contactLocation: "Contact & Location",
      email: "Email",
      phone: "Phone",
      location: "Location",
      website: "Website",

      account: "Account",
      accountStatus: "Account Status",
      lastUpdated: "Last Updated",
      changePassword: "Change Password",
      closePassword: "Close Password",
      manageDevices: "Manage Devices",

      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmNewPassword: "Confirm New Password",
      updatePassword: "Update Password",

      profilePreferences: "Profile & Preferences",
      headlinePlaceholder: "Headline",
      bioPlaceholder:
        "Tell people who you are, what you do, and what they get when they work with you.",

      theme: "Theme",
      themeSystem: "System",
      language: "Language",

      enableImportantUpdates: "Enable important updates",

      // browser notifications
      browserNotifications: "Browser Notifications",
      enableBrowserNotifications: "Enable Browser Notifications",
      notifNotSupported: "Notifications are not supported in this browser.",
      notifGranted: "Notifications enabled ✅",
      notifDenied: "Notifications blocked. Enable in browser settings.",
      notifDefault: "Permission not granted yet. Try again.",

      // toasts
      profileUpdated: "Profile updated successfully.",
      passwordUpdated: "Password changed successfully ✅",
      inboxRefreshed: "Inbox refreshed ✅",
      devicesRefreshed: "Devices refreshed ✅",
    },
  },

  es: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      refresh: "Actualizar",
      loading: "Cargando…",
      logout: "Cerrar sesión",
      editProfile: "Editar perfil",
      close: "Cerrar",
      errorGeneric: "Algo salió mal. Inténtalo de nuevo.",
      networkError: "Error de red. Inténtalo de nuevo.",
    },
    profile: {
      badge: "Tu Perfil",
      welcome: "Bienvenido",
      subtitle:
        "Detalles personales, presencia de marca y preferencias de cuenta — todo en un solo lugar.",

      role: "Rol",
      joined: "Registrado",
      userId: "ID de usuario",
      notifications: "Notificaciones",

      contactLocation: "Contacto y ubicación",
      email: "Correo",
      phone: "Teléfono",
      location: "Ubicación",
      website: "Sitio web",

      account: "Cuenta",
      accountStatus: "Estado de la cuenta",
      lastUpdated: "Última actualización",
      changePassword: "Cambiar contraseña",
      closePassword: "Cerrar contraseña",
      manageDevices: "Administrar dispositivos",

      currentPassword: "Contraseña actual",
      newPassword: "Nueva contraseña",
      confirmNewPassword: "Confirmar nueva contraseña",
      updatePassword: "Actualizar contraseña",

      profilePreferences: "Perfil y preferencias",
      headlinePlaceholder: "Titular",
      bioPlaceholder:
        "Cuenta quién eres, qué haces y qué obtiene la gente cuando trabaja contigo.",

      theme: "Tema",
      themeSystem: "Sistema",
      language: "Idioma",

      enableImportantUpdates: "Activar actualizaciones importantes",

      browserNotifications: "Notificaciones del navegador",
      enableBrowserNotifications: "Activar notificaciones",
      notifNotSupported: "Este navegador no admite notificaciones.",
      notifGranted: "Notificaciones activadas ✅",
      notifDenied: "Notificaciones bloqueadas. Actívalas en la configuración.",
      notifDefault: "Permiso no concedido. Inténtalo de nuevo.",

      profileUpdated: "Perfil actualizado correctamente.",
      passwordUpdated: "Contraseña actualizada ✅",
      inboxRefreshed: "Bandeja actualizada ✅",
      devicesRefreshed: "Dispositivos actualizados ✅",
    },
  },

  fr: {
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      refresh: "Rafraîchir",
      loading: "Chargement…",
      logout: "Se déconnecter",
      editProfile: "Modifier le profil",
      close: "Fermer",
      errorGeneric: "Une erreur est survenue. Réessaie.",
      networkError: "Erreur réseau. Réessaie.",
    },
    profile: {
      badge: "Votre Profil",
      welcome: "Bienvenue",
      subtitle:
        "Détails personnels, présence de marque et préférences du compte — tout au même endroit.",

      role: "Rôle",
      joined: "Inscrit",
      userId: "ID utilisateur",
      notifications: "Notifications",

      contactLocation: "Contact & localisation",
      email: "Email",
      phone: "Téléphone",
      location: "Localisation",
      website: "Site web",

      account: "Compte",
      accountStatus: "Statut du compte",
      lastUpdated: "Dernière mise à jour",
      changePassword: "Changer le mot de passe",
      closePassword: "Fermer mot de passe",
      manageDevices: "Gérer les appareils",

      currentPassword: "Mot de passe actuel",
      newPassword: "Nouveau mot de passe",
      confirmNewPassword: "Confirmer le nouveau mot de passe",
      updatePassword: "Mettre à jour",

      profilePreferences: "Profil & préférences",
      headlinePlaceholder: "Titre",
      bioPlaceholder:
        "Dites qui vous êtes, ce que vous faites et ce que les gens obtiennent en travaillant avec vous.",

      theme: "Thème",
      themeSystem: "Système",
      language: "Langue",

      enableImportantUpdates: "Activer les mises à jour importantes",

      browserNotifications: "Notifications navigateur",
      enableBrowserNotifications: "Activer les notifications",
      notifNotSupported: "Les notifications ne sont pas prises en charge ici.",
      notifGranted: "Notifications activées ✅",
      notifDenied: "Notifications bloquées. Activez-les dans le navigateur.",
      notifDefault: "Autorisation non accordée. Réessayez.",

      profileUpdated: "Profil mis à jour avec succès.",
      passwordUpdated: "Mot de passe mis à jour ✅",
      inboxRefreshed: "Boîte rafraîchie ✅",
      devicesRefreshed: "Appareils rafraîchis ✅",
    },
  },
};
