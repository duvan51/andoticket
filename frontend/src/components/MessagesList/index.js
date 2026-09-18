import React, { useState, useEffect, useReducer, useRef, useContext } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";

import { isSameDay, parseISO, format } from "date-fns";
import openSocket from "../../services/socket-io";
import clsx from "clsx";

import { green } from "@material-ui/core/colors";
import {
  Button,
  CircularProgress,
  Divider,
  IconButton,
  makeStyles,
} from "@material-ui/core";
import {
  AccessTime,
  Block,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
  Lock,
  LocalOffer,
  Reply,
  CameraAlt,
  Videocam,
  Mic,
  Description,
  LocationOn,
  Person,
  Storefront,
  OpenInNew,
} from "@material-ui/icons";

import { getBackendUrl } from "../../config";

import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import Audio from "../Audio";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },

  messagesList: {
    backgroundImage: `url(${whatsBackground})`,
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    padding: "20px",
    overflowY: "scroll",
    [theme.breakpoints.down("sm")]: {
      paddingBottom: "90px",
    },
    ...theme.scrollbarStyles,
  },

  circleLoading: {
    color: green[500],
    position: "absolute",
    opacity: "70%",
    top: 0,
    left: "50%",
    marginTop: 12,
  },

  messageLeft: {
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: "#ffffff",
    color: "#303030",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: "0 1px 1px #b3b3b3",
  },

  messageRight: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: "#dcf8c6",
    color: "#303030",
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: "0 1px 1px #b3b3b3",
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: "#f0f2f5",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#e2e5e9",
    },
  },

  quotedContainerRight: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: "#cfe9ba",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#b8dc9a",
    },
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: "#0288d1",
  },

  quotedSideColorRight: {
    flex: "none",
    width: "4px",
    backgroundColor: "#056162",
  },

  quotedMsgWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "6px 8px",
    minHeight: 38,
    gap: 8,
  },

  quotedMsgContent: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },

  quotedMsgHeader: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#056162",
    marginBottom: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  quotedMsgText: {
    fontSize: "0.8rem",
    color: "#54656f",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  quotedMediaText: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    color: "#54656f",
    fontSize: "0.8rem",
    fontWeight: 500,
  },

  quotedThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 4,
    objectFit: "cover",
    flexShrink: 0,
    backgroundColor: "#000",
  },

  adCardContainer: {
    margin: "-3px -70px 8px -6px",
    backgroundColor: "#ffffff",
    border: "1px solid #d0e2ff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
    transition: "all 0.2s ease-in-out",
    textDecoration: "none",
    color: "inherit",
    display: "block",
    "&:hover": {
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
      backgroundColor: "#f9fbff",
    },
  },
  adCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e8f0fe",
    padding: "5px 8px",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#1a73e8",
    borderBottom: "1px solid #e0e8f6",
  },
  adCardHeaderBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  adCardBody: {
    display: "flex",
    padding: "8px",
    gap: "10px",
    alignItems: "center",
  },
  adCardTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  adCardTitle: {
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "#1e293b",
    lineHeight: 1.25,
    marginBottom: "3px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  adCardDescription: {
    fontSize: "0.75rem",
    color: "#64748b",
    lineHeight: 1.2,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  adCardThumbnail: {
    width: 60,
    height: 60,
    borderRadius: "6px",
    objectFit: "cover",
    flexShrink: 0,
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
  },
  adCardFooter: {
    padding: "3px 8px 5px",
    fontSize: "0.7rem",
    color: "#1a73e8",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },

  highlightedMessage: {
    animation: "$flashHighlight 2s ease-in-out",
  },

  "@keyframes flashHighlight": {
    "0%": {
      backgroundColor: "#fff59d !important",
      boxShadow: "0 0 16px rgba(255, 235, 59, 0.95) !important",
    },
    "70%": {
      backgroundColor: "#fff59d !important",
    },
    "100%": {
      backgroundColor: "inherit",
    },
  },

  messageActionsButton: {
    display: "none",
    position: "relative",
    color: "#999",
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" },
  },

  forwardedBadge: {
    display: "flex",
    alignItems: "center",
    marginBottom: 4,
    color: "#667781",
    fontSize: "0.75rem",
    fontStyle: "italic",
    paddingLeft: 2,
    paddingTop: 2,
  },

  forwardedIcon: {
    transform: "scaleX(-1)",
    fontSize: 13,
    marginRight: 4,
    color: "#8696a0",
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },

  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 5,
    color: "#999",
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "110px",
    backgroundColor: "#e1f3fb",
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "0 1px 1px #b3b3b3",
  },

  dailyTimestampText: {
    color: "#808888",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  ackIcons: {
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
  },

  ackDoneAllIcon: {
    color: green[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
  },
  messageNote: {
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: 4,
    marginBottom: 4,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    whiteSpace: "pre-wrap",
    backgroundColor: "#fff9c4",
    color: "#303030",
    alignSelf: "center",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    border: "1px solid #fff59d"
  },
  noteHeader: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "#f57f17",
    fontWeight: "bold",
    marginBottom: 4,
    gap: 4
  },
  messageTag: {
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: 4,
    marginBottom: 4,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    whiteSpace: "pre-wrap",
    backgroundColor: "#e8eaf6",
    color: "#303030",
    alignSelf: "center",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    border: "1px solid #c5cae9"
  },
  tagHeader: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "#3f51b5",
    fontWeight: "bold",
    marginBottom: 4,
    gap: 4
  },
  messageSchedule: {
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: 4,
    marginBottom: 4,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    whiteSpace: "pre-wrap",
    backgroundColor: "#eceff1",
    color: "#37474f",
    alignSelf: "center",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    border: "1px solid #cfd8dc"
  },
  scheduleHeader: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "#546e7a",
    fontWeight: "bold",
    marginBottom: 4,
    gap: 4
  }
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

    messages.forEach((message) => {
      const messageIndex = state.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        state[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...state];
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const messageIndex = state.findIndex((m) => m.id === newMessage.id);

    if (messageIndex !== -1) {
      state[messageIndex] = newMessage;
    } else {
      state.push(newMessage);
    }

    return [...state];
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageToUpdate.id);

    if (messageIndex !== -1) {
      state[messageIndex] = messageToUpdate;
    }

    return [...state];
  }

  if (action.type === "DELETE_MESSAGE") {
    const messageId = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageId || `schedule-${m.id}` === messageId);
    if (messageIndex !== -1) {
      state.splice(messageIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const MessagesList = ({ ticketId, isGroup }) => {
  const classes = useStyles();

  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMessageRef = useRef();

  const [selectedMessage, setSelectedMessage] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const currentTicketId = useRef(ticketId);
  const { user } = useContext(AuthContext);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setTicket(null);

    currentTicketId.current = ticketId;
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchMessages = async () => {
        try {
          const { data } = await api.get("/messages/" + ticketId, {
            params: { pageNumber },
          });

          if (currentTicketId.current === ticketId) {
            dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
            setTicket(data.ticket);
            setHasMore(data.hasMore);
            setLoading(false);
          }

          if (pageNumber === 1 && data.messages.length > 1) {
            scrollToBottom();
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchMessages();
    }, 500);
    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, ticketId]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("connect", () => socket.emit("joinChatBox", ticketId));

    socket.on("appMessage", (data) => {
      if (data.action === "create") {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        scrollToBottom();
      }

      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }

      if (data.action === "delete_schedule") {
        dispatch({ type: "DELETE_MESSAGE", payload: `schedule-${data.scheduleId}` });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_MESSAGE", payload: data.messageId });
      }

      if (data.action === "clean") {
        dispatch({ type: "RESET" });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticketId]);

  const loadMore = () => {
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };

  const scrollToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({});
    }
  };

  const handleScroll = (e) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;

    if (scrollTop === 0) {
      document.getElementById("messagesList").scrollTop = 1;
    }

    if (loading) {
      return;
    }

    if (scrollTop < 50) {
      loadMore();
    }
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    setAnchorEl(e.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageOptionsMenu = (e) => {
    setAnchorEl(null);
  };

  const handleScrollToQuotedMsg = (targetMsgId) => {
    if (!targetMsgId) return;
    const targetEl = document.getElementById(`message-${targetMsgId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.add(classes.highlightedMessage);
      setTimeout(() => {
        targetEl.classList.remove(classes.highlightedMessage);
      }, 2000);
    }
  };

  const checkMessageMedia = (message) => {
    if (message.mediaType === "location" && message.body.split('|').length >= 2) {
      let locationParts = message.body.split('|')
      let imageLocation = locationParts[0]
      let linkLocation = locationParts[1]

      let descriptionLocation = null

      if (locationParts.length > 2)
        descriptionLocation = message.body.split('|')[2]

      return <LocationPreview image={imageLocation} link={linkLocation} description={descriptionLocation} />
    }
    else if (message.mediaType === "vcard") {
      //console.log("vcard")
      //console.log(message)
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      return <VcardPreview contact={contact} numbers={obj[0]?.number} />
    }
    /*else if (message.mediaType === "multi_vcard") {
      console.log("multi_vcard")
      console.log(message)
    	
      if(message.body !== null && message.body !== "") {
        let newBody = JSON.parse(message.body)
        return (
          <>
            {
            newBody.map(v => (
              <VcardPreview contact={v.name} numbers={v.number} />
            ))
            }
          </>
        )
      } else return (<></>)
    }*/
    else if ( /^.*\.(jpe?g|png|gif|webp)?$/i.exec(message.mediaUrl) && message.mediaType === "image") {
      return <ModalImageCors imageUrl={message.mediaUrl} />;
    } else if (message.mediaType === "audio" || message.mediaType === "ptt") {
      return <Audio url={message.mediaUrl} />
    } else if (message.mediaType === "video") {
      return (
        <video
          className={classes.messageMedia}
          src={message.mediaUrl}
          controls
        />
      );
    } else {
      return (
        <>
          <div className={classes.downloadMedia}>
            <Button
              startIcon={<GetApp />}
              color="primary"
              variant="outlined"
              target="_blank"
              href={message.mediaUrl}
            >
              Download
            </Button>
          </div>
          <Divider />
        </>
      );
    }
  };

  const shouldRenderMessageBody = (message) => {
    if (!message || !message.body) return false;

    // Audios and voice notes never display filename or body text below the player
    if (message.mediaType === "audio" || message.mediaType === "ptt") {
      return false;
    }

    // If body matches mediaUrl or filename
    if (message.mediaUrl) {
      if (message.body === message.mediaUrl || message.mediaUrl.endsWith(message.body)) {
        return false;
      }
      // Auto-generated filenames e.g. "xw1Wg-1789131552573.mp3" or "1788205230640.jpg"
      if (/^[\w\s.-]+\.(mp3|ogg|wav|opus|m4a|aac|jpe?g|png|webp|gif|jfif|mp4|webm|pdf|doc|docx)$/i.test(message.body.trim())) {
        return false;
      }
    }

    return true;
  };

  const renderMessageAck = (message) => {
    if (message.ack === -1) {
      return <AccessTime fontSize="small" style={{ color: "#f44336" }} />;
    }
    if (message.ack === 0) {
      return <AccessTime fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 1) {
      return <Done fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 2) {
      return <DoneAll fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 3 || message.ack === 4) {
      return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />;
    }
  };

  const renderDailyTimestamps = (message, index) => {
    if (index === 0) {
      return (
        <span
          className={classes.dailyTimestamp}
          key={`timestamp-${message.id}`}
        >
          <div className={classes.dailyTimestampText}>
            {format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
          </div>
        </span>
      );
    }
    if (index < messagesList.length - 1) {
      let messageDay = parseISO(messagesList[index].createdAt);
      let previousMessageDay = parseISO(messagesList[index - 1].createdAt);

      if (!isSameDay(messageDay, previousMessageDay)) {
        return (
          <span
            className={classes.dailyTimestamp}
            key={`timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
            </div>
          </span>
        );
      }
    }
    if (index === messagesList.length - 1) {
      return (
        <div
          key={`ref-${message.createdAt}`}
          ref={lastMessageRef}
          style={{ float: "left", clear: "both" }}
        />
      );
    }
  };

  const renderMessageDivider = (message, index) => {
    if (index < messagesList.length && index > 0) {
      let messageUser = messagesList[index].fromMe;
      let previousMessageUser = messagesList[index - 1].fromMe;

      if (messageUser !== previousMessageUser) {
        return (
          <span style={{ marginTop: 16 }} key={`divider-${message.id}`}></span>
        );
      }
    }
  };

  const renderQuotedMessage = (message) => {
    const quoted = message.quotedMsg;
    if (!quoted) return null;

    const renderQuotedBody = () => {
      const { mediaType, body, mediaUrl } = quoted;
      if (mediaType === "image") {
        return (
          <span className={classes.quotedMediaText}>
            <CameraAlt style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }} />
            {body && body !== mediaUrl && !body.startsWith("http") ? body : "Foto"}
          </span>
        );
      }
      if (mediaType === "video") {
        return (
          <span className={classes.quotedMediaText}>
            <Videocam style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }} />
            {body && body !== mediaUrl && !body.startsWith("http") ? body : "Video"}
          </span>
        );
      }
      if (mediaType === "audio" || mediaType === "ptt") {
        return (
          <span className={classes.quotedMediaText}>
            <Mic style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }} />
            Nota de voz
          </span>
        );
      }
      if (mediaType === "document") {
        return (
          <span className={classes.quotedMediaText}>
            <Description style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }} />
            {body || "Documento"}
          </span>
        );
      }
      if (mediaType === "location") {
        return (
          <span className={classes.quotedMediaText}>
            <LocationOn style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }} />
            Ubicación
          </span>
        );
      }
      if (mediaType === "vcard") {
        return (
          <span className={classes.quotedMediaText}>
            <Person style={{ fontSize: 15, marginRight: 4, verticalAlign: "middle" }} />
            Contacto
          </span>
        );
      }
      return <span>{body}</span>;
    };

    const renderThumbnail = () => {
      if (!quoted.mediaUrl) return null;
      if (quoted.mediaType === "image") {
        return (
          <img
            src={quoted.mediaUrl}
            alt="quote-thumb"
            className={classes.quotedThumbnail}
          />
        );
      }
      if (quoted.mediaType === "video") {
        return (
          <video
            src={quoted.mediaUrl}
            className={classes.quotedThumbnail}
          />
        );
      }
      return null;
    };

    return (
      <div
        className={clsx(classes.quotedContainerLeft, {
          [classes.quotedContainerRight]: message.fromMe,
        })}
        onClick={() => handleScrollToQuotedMsg(message.quotedMsgId || quoted.id)}
        title="Clic para ir al mensaje original"
      >
        <span
          className={clsx(classes.quotedSideColorLeft, {
            [classes.quotedSideColorRight]: quoted.fromMe,
          })}
        ></span>
        <div className={classes.quotedMsgWrapper}>
          <div className={classes.quotedMsgContent}>
            <div className={classes.quotedMsgHeader}>
              <span className={classes.messageContactName}>
                {quoted.fromMe
                  ? "Tú"
                  : quoted.contact?.name || "Contacto"}
              </span>
            </div>
            <div className={classes.quotedMsgText}>
              {renderQuotedBody()}
            </div>
          </div>
          {renderThumbnail()}
        </div>
      </div>
    );
  };

  const renderAdReply = (message) => {
    if (!message.adReply) return null;

    let adData = null;
    try {
      adData = typeof message.adReply === "string" ? JSON.parse(message.adReply) : message.adReply;
    } catch (e) {
      return null;
    }

    if (!adData || (!adData.title && !adData.thumbnailUrl && !adData.body)) {
      return null;
    }

    const { title, body, thumbnailUrl, sourceUrl } = adData;

    let fullThumbnailUrl = thumbnailUrl;
    if (thumbnailUrl && !thumbnailUrl.startsWith("http") && !thumbnailUrl.startsWith("data:")) {
      fullThumbnailUrl = `${getBackendUrl()}/public/${thumbnailUrl}`.replace(/([^:]\/)\/+/g, "$1");
    }

    const CardContent = (
      <div className={classes.adCardContainer}>
        <div className={classes.adCardHeader}>
          <div className={classes.adCardHeaderBadge}>
            <Storefront style={{ fontSize: 14 }} />
            <span>Anuncio de Facebook / Instagram</span>
          </div>
          {sourceUrl && <OpenInNew style={{ fontSize: 13, opacity: 0.8 }} />}
        </div>
        <div className={classes.adCardBody}>
          <div className={classes.adCardTextContainer}>
            {title && <div className={classes.adCardTitle}>{title}</div>}
            {body && <div className={classes.adCardDescription}>{body}</div>}
          </div>
          {fullThumbnailUrl && (
            <img
              src={fullThumbnailUrl}
              alt={title || "Anuncio"}
              className={classes.adCardThumbnail}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
        </div>
        {sourceUrl && (
          <div className={classes.adCardFooter}>
            <span>Ver anuncio original ↗</span>
          </div>
        )}
      </div>
    );

    if (sourceUrl) {
      return (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit" }}
          onClick={(e) => e.stopPropagation()}
        >
          {CardContent}
        </a>
      );
    }

    return CardContent;
  };

  const renderMessages = () => {
    if (messagesList.length > 0) {
      const viewMessagesList = messagesList.map((message, index) => {
        if (message.isScheduled) {
          return (
            <React.Fragment key={`schedule-${message.id}`}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div id={`message-${message.id}`} className={classes.messageSchedule}>
                <div className={classes.scheduleHeader}>
                  <AccessTime style={{ fontSize: 14, color: "#546e7a", marginRight: 4 }} />
                  <span>MENSAJE PROGRAMADO - ENVIAR EL {format(parseISO(message.sendAt || message.createdAt), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard") && checkMessageMedia(message)}
                <div style={{ overflowWrap: "break-word", paddingRight: 60 }}>
                  {shouldRenderMessageBody(message) && (
                    <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  )}
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (message.mediaType === "schedule_history") {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div id={`message-${message.id}`} className={classes.messageTag} style={{ backgroundColor: "#eceff1", border: "1px solid #cfd8dc" }}>
                <div className={classes.tagHeader} style={{ color: "#455a64" }}>
                  <AccessTime style={{ fontSize: 14, color: "#455a64", marginRight: 4 }} />
                  <span>SISTEMA - PROGRAMACIÓN</span>
                </div>
                <div style={{ overflowWrap: "break-word", paddingRight: 60 }}>
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (message.mediaType === "tag") {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div id={`message-${message.id}`} className={classes.messageTag}>
                <div className={classes.tagHeader}>
                  <LocalOffer style={{ fontSize: 14, color: "#3f51b5", marginRight: 4 }} />
                  <span>SISTEMA - ETIQUETA</span>
                </div>
                <div style={{ overflowWrap: "break-word", paddingRight: 60 }}>
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (message.mediaType === "note") {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div id={`message-${message.id}`} className={classes.messageNote}>
                <div className={classes.noteHeader}>
                  <Lock style={{ fontSize: 14, color: "#f57f17", marginRight: 4 }} />
                  <span>NOTA INTERNA</span>
                </div>
                <div style={{ overflowWrap: "break-word", paddingRight: 60 }}>
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        const isFromMe = ticket?.contact?.number?.startsWith("user_group_")
          ? message.contact?.number === `user_${user?.id}`
          : message.fromMe;

        if (!isFromMe) {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div id={`message-${message.id}`} className={classes.messageLeft}>
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {message.isForwarded && (
                  <div className={classes.forwardedBadge}>
                    <Reply className={classes.forwardedIcon} />
                    <span>
                      {message.forwardingScore > 1
                        ? i18n.t("forwardModal.forwardedManyTag") || "Reenviado muchas veces"
                        : i18n.t("forwardModal.forwardedTag") || "Reenviado"}
                    </span>
                  </div>
                )}
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard"
                  //|| message.mediaType === "multi_vcard" 
                ) && checkMessageMedia(message)}
                <div className={classes.textContentItem}>
                  {renderAdReply(message)}
                  {message.quotedMsg && renderQuotedMessage(message)}
                  {shouldRenderMessageBody(message) && (
                    <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  )}
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div id={`message-${message.id}`} className={classes.messageRight}>
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {message.isForwarded && (
                  <div className={classes.forwardedBadge}>
                    <Reply className={classes.forwardedIcon} />
                    <span>
                      {message.forwardingScore > 1
                        ? i18n.t("forwardModal.forwardedManyTag") || "Reenviado muchas veces"
                        : i18n.t("forwardModal.forwardedTag") || "Reenviado"}
                    </span>
                  </div>
                )}
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard"
                  //|| message.mediaType === "multi_vcard" 
                ) && checkMessageMedia(message)}
                <div
                  className={clsx(classes.textContentItem, {
                    [classes.textContentItemDeleted]: message.isDeleted,
                  })}
                >
                  {message.isDeleted && (
                    <Block
                      color="disabled"
                      fontSize="small"
                      className={classes.deletedIcon}
                    />
                  )}
                  {renderAdReply(message)}
                  {message.quotedMsg && renderQuotedMessage(message)}
                  {shouldRenderMessageBody(message) && (
                    <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  )}
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                    {renderMessageAck(message)}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }
      });
      return viewMessagesList;
    } else {
      return <div>Say hello to your new contact!</div>;
    }
  };

  return (
    <div className={classes.messagesListWrapper}>
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />
      <div
        id="messagesList"
        className={classes.messagesList}
        onScroll={handleScroll}
      >
        {messagesList.length > 0 ? renderMessages() : []}
      </div>
      {loading && (
        <div>
          <CircularProgress className={classes.circleLoading} />
        </div>
      )}
    </div>
  );
};

export default MessagesList;