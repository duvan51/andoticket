import React from "react";
import { Button } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { toast } from "react-toastify";
import api from "../../services/api";

const GoogleLoginButton = () => {
  const handleGoogleLogin = async () => {
    // Open Google OAuth in a popup
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?
      client_id=1081494715209-i7gkdi96jobl1dnrn3kqoiq4ovbpq01p.apps.googleusercontent.com&
      redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&
      response_type=token&
      scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}`;
    
    const popup = window.open(googleAuthUrl, 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);
    
    // Listen for the callback
    const checkPopup = setInterval(() => {
      try {
        if (popup?.closed) {
          clearInterval(checkPopup);
          return;
        }
        
        const url = popup?.location?.href;
        if (url?.includes('access_token')) {
          clearInterval(checkPopup);
          
          // Extract token from URL
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          
          if (accessToken) {
            // Get user info from Google
            fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
            .then(res => res.json())
            .then(async (userInfo) => {
              try {
                // Send to our backend
                const { data } = await api.post("/auth/google", { 
                  token: accessToken 
                });
                
                localStorage.setItem("token", data.token);
                api.defaults.headers.Authorization = `Bearer ${data.token}`;
                
                window.location.href = "/tickets";
              } catch (error) {
                toast.error("Error al iniciar sesión con Google");
                popup?.close();
              }
            });
          }
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 500);
  };

  return (
    <Button
      fullWidth
      variant="outlined"
      color="primary"
      onClick={handleGoogleLogin}
      style={{ marginTop: 16 }}
    >
      Iniciar sesión con Google
    </Button>
  );
};

export default GoogleLoginButton;
