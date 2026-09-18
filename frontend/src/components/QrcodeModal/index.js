import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

import {
  Dialog,
  DialogContent,
  Typography,
  makeStyles,
  Box,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Paper
} from "@material-ui/core";
import {
  CropFree as QrCodeIcon,
  PhoneAndroid as PhoneIcon,
  FileCopy as CopyIcon,
  Check as CheckIcon
} from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: theme.palette.background.paper,
  },
  title: {
    fontWeight: "bold",
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  whatsappName: {
    fontWeight: "600",
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
  },
  tabsRoot: {
    marginBottom: theme.spacing(3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    width: "100%",
  },
  tab: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  tabContent: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  qrContainer: {
    padding: theme.spacing(2),
    backgroundColor: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    marginBottom: theme.spacing(2.5),
    display: "inline-block",
  },
  instructions: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
    maxWidth: 420,
    fontSize: "0.9rem",
  },
  pairingForm: {
    width: "100%",
    maxWidth: 440,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  input: {
    marginBottom: theme.spacing(2),
  },
  submitButton: {
    padding: theme.spacing(1.2),
    fontWeight: 700,
    borderRadius: 10,
    textTransform: "none",
    fontSize: "1rem",
  },
  codeCard: {
    width: "100%",
    maxWidth: 440,
    padding: theme.spacing(2.5),
    backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "#f0f7ff",
    borderRadius: 16,
    border: `1.5px dashed ${theme.palette.primary.main}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: theme.spacing(2.5),
  },
  codeDisplay: {
    fontSize: "2.2rem",
    fontWeight: 800,
    letterSpacing: "4px",
    fontFamily: "monospace",
    color: theme.palette.primary.main,
    margin: theme.spacing(1, 0),
    userSelect: "all",
  },
  stepsContainer: {
    width: "100%",
    maxWidth: 440,
    textAlign: "left",
    backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "#fafafa",
    borderRadius: 12,
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
  },
  stepsTitle: {
    fontWeight: 700,
    fontSize: "0.9rem",
    marginBottom: theme.spacing(1.5),
    color: theme.palette.text.primary,
  },
  stepItem: {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: theme.spacing(1),
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
    lineHeight: 1.4,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  stepNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: 700,
    marginRight: theme.spacing(1.2),
    flexShrink: 0,
    marginTop: 2,
  },
}));

const QrcodeModal = ({ open, onClose, whatsAppId, whatsAppName, onSuccess }) => {
  const classes = useStyles();
  const [tabIndex, setTabIndex] = useState(0);
  const [qrCode, setQrCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        if (data.qrcode && data.qrcode.length < 15) {
          setPairingCode(data.qrcode);
        } else {
          setQrCode(data.qrcode);
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!whatsAppId) return;
    const socket = openSocket();

    const handleSessionUpdate = (session) => {
      if (session.id == whatsAppId) {
        if (session.qrcode && session.qrcode.length < 15) {
          setPairingCode(session.qrcode);
        } else {
          setQrCode(session.qrcode);
        }

        if (session.status === "CONNECTED" || session.status === "READY") {
          if (typeof onSuccess === "function") {
            onSuccess();
          }
          onClose();
        }
        if (session.qrcode === "" && (session.status === "DISCONNECTED" || session.status === "TIMEOUT")) {
          onClose();
        }
      }
    };

    socket.on("whatsappSession", (data) => {
      if (data.action === "update") {
        handleSessionUpdate(data.session);
      }
    });

    socket.on("whatsapp", (data) => {
      if (data.action === "update") {
        handleSessionUpdate(data.whatsapp);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [whatsAppId, onClose, onSuccess]);

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  const handleRequestPairingCode = async (e) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 8) {
      toast.error(i18n.t("qrCode.phoneHelperText"));
      return;
    }

    setLoadingCode(true);
    try {
      const { data } = await api.post(`/whatsappsession/${whatsAppId}/pairing-code`, {
        phoneNumber: cleanNumber,
      });
      if (data?.code) {
        setPairingCode(data.code);
        toast.success(i18n.t("qrCode.pairingCodeTitle"));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    const cleanCode = pairingCode.replace(/\s+/g, "");
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    toast.success(i18n.t("qrCode.codeCopied"));
    setTimeout(() => setCopied(false), 3000);
  };

  const formatCode = (code) => {
    if (!code) return "";
    const clean = code.replace(/[^a-zA-Z0-9]/g, "");
    if (clean.length === 8) {
      return `${clean.slice(0, 4)} - ${clean.slice(4)}`;
    }
    return code;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: { borderRadius: 20 },
      }}
    >
      <DialogContent>
        <Box className={classes.paper}>
          <Typography variant="h5" className={classes.title}>
            {i18n.t("qrCode.title")}
          </Typography>

          {whatsAppName && (
            <Typography variant="subtitle1" className={classes.whatsappName}>
              Conexión: {whatsAppName}
            </Typography>
          )}

          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            className={classes.tabsRoot}
          >
            <Tab
              icon={<QrCodeIcon />}
              label={i18n.t("qrCode.tabQr")}
              className={classes.tab}
            />
            <Tab
              icon={<PhoneIcon />}
              label={i18n.t("qrCode.tabPairingCode")}
              className={classes.tab}
            />
          </Tabs>

          {tabIndex === 0 && (
            <Box className={classes.tabContent}>
              <Typography variant="body2" className={classes.instructions}>
                {i18n.t("qrCode.message")}
              </Typography>

              <Box className={classes.qrContainer}>
                {qrCode ? (
                  <QRCode value={qrCode} size={256} level="H" />
                ) : (
                  <Box display="flex" flexDirection="column" alignItems="center" p={8}>
                    <CircularProgress size={60} />
                    <Typography variant="caption" style={{ marginTop: 20 }}>
                      {i18n.t("qrCode.qrWaiting")}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="caption" color="textSecondary">
                {i18n.t("qrCode.qrInstructions")}
              </Typography>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box className={classes.tabContent}>
              <form onSubmit={handleRequestPairingCode} className={classes.pairingForm}>
                <TextField
                  variant="outlined"
                  size="small"
                  label={i18n.t("qrCode.phoneLabel")}
                  placeholder={i18n.t("qrCode.phonePlaceholder")}
                  helperText={i18n.t("qrCode.phoneHelperText")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  fullWidth
                  className={classes.input}
                  disabled={loadingCode}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loadingCode || !phoneNumber}
                  className={classes.submitButton}
                >
                  {loadingCode ? (
                    <Box display="flex" alignItems="center">
                      <CircularProgress size={22} color="inherit" style={{ marginRight: 8 }} />
                      {i18n.t("qrCode.requestingCode")}
                    </Box>
                  ) : (
                    i18n.t("qrCode.requestCode")
                  )}
                </Button>
              </form>

              {pairingCode && (
                <Paper className={classes.codeCard} elevation={0}>
                  <Typography variant="caption" color="textSecondary">
                    {i18n.t("qrCode.pairingCodeTitle")}
                  </Typography>
                  <Typography className={classes.codeDisplay}>
                    {formatCode(pairingCode)}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                    onClick={handleCopyCode}
                  >
                    {copied ? i18n.t("qrCode.codeCopied") : i18n.t("qrCode.copyCode")}
                  </Button>
                </Paper>
              )}

              <Box className={classes.stepsContainer}>
                <Typography className={classes.stepsTitle}>
                  {i18n.t("qrCode.instructionsTitle")}
                </Typography>
                <Box className={classes.stepItem}>
                  <span className={classes.stepNumber}>1</span>
                  <span>{i18n.t("qrCode.step1")}</span>
                </Box>
                <Box className={classes.stepItem}>
                  <span className={classes.stepNumber}>2</span>
                  <span>{i18n.t("qrCode.step2")}</span>
                </Box>
                <Box className={classes.stepItem}>
                  <span className={classes.stepNumber}>3</span>
                  <span>{i18n.t("qrCode.step3")}</span>
                </Box>
                <Box className={classes.stepItem}>
                  <span className={classes.stepNumber}>4</span>
                  <span>{i18n.t("qrCode.step4")}</span>
                </Box>
                <Box className={classes.stepItem}>
                  <span className={classes.stepNumber}>5</span>
                  <span>{i18n.t("qrCode.step5")}</span>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);

