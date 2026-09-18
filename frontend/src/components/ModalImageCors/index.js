import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import BrokenImageIcon from "@material-ui/icons/BrokenImage";
import clsx from "clsx";

import ModalImage from "react-modal-image";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  wrapper: {
    position: "relative",
    display: "inline-block",
    overflow: "hidden",
    borderRadius: 8,
    maxWidth: "100%",
    backgroundColor: "#f0f2f5",
  },
  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: 200,
    maxWidth: "100%",
    borderRadius: 8,
    display: "block",
    cursor: "pointer",
    transition: "opacity 0.25s ease-in-out",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    zIndex: 1,
  },
  errorContainer: {
    width: 250,
    height: 140,
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    color: "#9e9e9e",
    padding: 10,
    textAlign: "center",
    gap: 6,
  },
  errorText: {
    fontSize: "11px",
    fontWeight: 500,
  },
}));

const normalizeUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }

  const rawBase = api.defaults.baseURL || "";
  const baseUrl = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

  // Si la URL apunta a localhost pero estamos en producción o dominio real
  if (url.startsWith("http://localhost") && baseUrl && !baseUrl.includes("localhost")) {
    const pathPart = url.replace(/^http:\/\/localhost(:\d+)?/, "");
    return `${baseUrl}${pathPart}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/public/") || url.startsWith("public/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  }

  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}/public${cleanPath}`;
};

const ModalImageCors = ({ imageUrl, className, style, alt }) => {
  const classes = useStyles();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const displayUrl = normalizeUrl(imageUrl);

  useEffect(() => {
    if (!displayUrl) return;
    let isMounted = true;

    const img = new Image();
    img.src = displayUrl;

    if (img.complete) {
      setLoaded(true);
    } else {
      img.onload = () => {
        if (isMounted) setLoaded(true);
      };
      img.onerror = () => {
        if (isMounted) setError(true);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [displayUrl]);

  if (!displayUrl || error) {
    return (
      <div className={clsx(classes.errorContainer, className)} style={style}>
        <BrokenImageIcon style={{ fontSize: 28, color: "#bdbdbd" }} />
        <span className={classes.errorText}>Imagen no disponible</span>
      </div>
    );
  }

  const customMediaStyle = {
    ...style,
    opacity: loaded ? 1 : 0.4,
  };

  return (
    <div
      className={clsx(classes.wrapper, className)}
      style={{
        ...style,
        width: style?.width || undefined,
        height: style?.height || undefined,
      }}
    >
      {!loaded && (
        <div className={classes.loadingContainer}>
          <CircularProgress size={24} style={{ color: "#25d366" }} />
        </div>
      )}
      <ModalImage
        className={clsx(classes.messageMedia, className)}
        style={customMediaStyle}
        small={displayUrl}
        smallSrcSet={displayUrl}
        medium={displayUrl}
        large={displayUrl}
        alt={alt || "image"}
        hideDownload={false}
        hideZoom={false}
      />
    </div>
  );
};

export default ModalImageCors;
