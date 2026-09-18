import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  makeStyles
} from "@material-ui/core";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import RefreshIcon from "@material-ui/icons/Refresh";
import VideocamIcon from "@material-ui/icons/Videocam";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  headerTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContent: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  searchField: {
    marginBottom: theme.spacing(2),
    width: "100%",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(4),
  },
  productImage: {
    width: 65,
    height: 65,
    marginRight: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    objectFit: "cover",
  },
  productItem: {
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    padding: theme.spacing(1.5, 2),
    "&:hover": {
      backgroundColor: "#fafdff",
    },
  },
  chipContainer: {
    display: "flex",
    gap: theme.spacing(0.8),
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    flexWrap: "wrap",
  },
  codeChip: {
    fontWeight: "bold",
    fontSize: "0.75rem",
  },
  areaChip: {
    fontSize: "0.75rem",
  },
  videoChip: {
    fontSize: "0.75rem",
    backgroundColor: "#fff0f0",
    color: "#d32f2f",
  }
}));

const ExternalProductsModal = ({ open, onClose, onSelect }) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProducts = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings/external-products", {
        params: {
          search: searchParam,
          refresh: forceRefresh ? "true" : "false"
        }
      });
      if (isMounted.current) {
        setProducts(data || []);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!open) return;

    const delayDebounceFn = setTimeout(() => {
      fetchProducts(false);
    }, searchParam ? 500 : 0);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, open]);

  const handleRefresh = () => {
    fetchProducts(true);
  };

  const handleSelectProduct = (product) => {
    if (onSelect) {
      onSelect(product);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle disableTypography className={classes.headerTitle}>
        <div className={classes.titleContent}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            Catálogo de Productos
          </Typography>
        </div>
        <Tooltip title="Refrescar catálogo">
          <IconButton onClick={handleRefresh} disabled={loading} size="small">
            <RefreshIcon color="primary" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          className={classes.searchField}
          label="Buscar productos por código, título o descripción..."
          variant="outlined"
          size="small"
          value={searchParam}
          onChange={(e) => setSearchParam(e.target.value)}
        />

        {loading ? (
          <div className={classes.loadingContainer}>
            <CircularProgress />
          </div>
        ) : (
          <List style={{ maxHeight: 380, overflowY: "auto" }}>
            {products.length === 0 ? (
              <Typography align="center" color="textSecondary" style={{ padding: 25 }}>
                No se encontraron productos en el catálogo.
              </Typography>
            ) : (
              products.map((product) => {
                const imageUrl = product.main_image || product.image || product.imageUrl || product.thumbnail;
                const title = product.title || product.name || "Producto sin título";
                const code = product.code;
                const builtArea = product.built_area || product.lot_area || product.area;
                const videoUrl = product.video_url || product.videoUrl || product.video;
                const description = product.description || product.body || "";

                return (
                  <ListItem
                    key={product.id || product.code || title}
                    className={classes.productItem}
                    onClick={() => handleSelectProduct(product)}
                  >
                    {imageUrl && (
                      <ListItemAvatar>
                        <img
                          src={imageUrl}
                          alt={title}
                          className={classes.productImage}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </ListItemAvatar>
                    )}
                    <ListItemText
                      primary={
                        <div>
                          <Typography variant="subtitle1" style={{ fontWeight: "600", lineHeight: 1.2 }}>
                            {title.trim()}
                          </Typography>
                          <div className={classes.chipContainer}>
                            {code && (
                              <Chip
                                label={`CÓD: ${code}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                className={classes.codeChip}
                              />
                            )}
                            {builtArea && (
                              <Chip
                                label={`Área: ${builtArea} m²`}
                                size="small"
                                className={classes.areaChip}
                              />
                            )}
                            {videoUrl && (
                              <Chip
                                icon={<VideocamIcon style={{ fontSize: 16 }} />}
                                label="Video"
                                size="small"
                                className={classes.videoChip}
                              />
                            )}
                          </div>
                        </div>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginTop: 4
                          }}
                        >
                          {description}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExternalProductsModal;
