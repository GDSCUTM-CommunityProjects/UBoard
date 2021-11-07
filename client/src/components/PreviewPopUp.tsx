import React from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

export default function PreviewPopUp(props: {
  title: string;
  body: string;
  img: string;
  tags: string;
  eventCapacity: string;
  location: string;
  openPopup: boolean;
  handleClose: any;
}) {
  const {
    title,
    body,
    img,
    tags,
    eventCapacity,
    location,
    openPopup,
    handleClose,
  } = props;
  return (
    <Dialog open={openPopup} scroll="paper" data-testid="PreviewPopUpComponent">
      <DialogContent>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          <CardMedia
            component="img"
            image={img}
            alt="placeholder"
            sx={{ minWidth: "250px", maxWidth: "700px", maxHeight: "200px" }}
          />
          <CardContent sx={{ py: 1 }} data-testid="previewCard">
            <Typography variant="h5" component="h5" fontWeight="bold">
              {title}
            </Typography>
            <Typography sx={{ fontStyle: "italic" }} display="inline">
              x mins ago by UserName
            </Typography>
            <Box>
              <Typography sx={{ paddingTop: 2, overflow: "auto" }}>
                {body}
              </Typography>
            </Box>
          </CardContent>
          <CardContent>
            <Grid container sx={{ py: 1 }}>
              <Grid item xs={12}>
                <Typography>Capacity: {eventCapacity}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>Location: {location}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>Tags: {tags}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={handleClose} color="secondary">
          Back
        </Button>
      </DialogActions>
    </Dialog>
  );
}
