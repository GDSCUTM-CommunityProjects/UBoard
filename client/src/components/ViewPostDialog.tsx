import React from 'react';
import Button from '@mui/material/Button';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ArrowBack from '@mui/icons-material/ArrowBack';
import MoreVert from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import Snackbar from '@mui/material/Snackbar';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Pagination from '@mui/material/Pagination';

import { UserContext } from '../App';
import PostComment from './PostComment';
import { LocationMap, LocationPickerMap } from './LocationMap';

import ServerApi, { CommentsUser, PostUser } from '../api/v1';
import GenerateTags from './Tags';
import { NavigateFunction, useNavigate, useParams } from 'react-router-dom';
import { User } from 'models/user';
import { typeLabels, typeButtonLabels } from './constants/postTypes';

const api = new ServerApi();
const COMMENTS_PER_PAGE = 10;

function CommentsHandler(props: { postID: string; currentUser: User }) {
  const [commentInput, setInput] = React.useState('');
  const [recentComments, setComments] = React.useState([] as CommentsUser[]);
  const [totalPages, setPageCount] = React.useState(0);
  const [currPage, setPage] = React.useState(1);
  const [hasInteractedComment, setCommentInteraction] = React.useState(false);

  const submitHandler = async () => {
    if (commentInput.length >= 10 && commentInput.length <= 250) {
      await api.createComment(props.postID, commentInput);
      setCommentInteraction(true);
      setInput('');
    }
  };

  const fetchComments = React.useCallback(() => {
    api
      .getComments(
        props.postID,
        COMMENTS_PER_PAGE,
        COMMENTS_PER_PAGE * (currPage - 1)
      )
      .then((res) => {
        if (res.data && res.data.data.result) {
          setComments(res.data.data.result);
          setPageCount(Math.ceil(res.data.data.total / COMMENTS_PER_PAGE));
        } else {
          setComments([]);
          setPageCount(1);
        }
      })
      .catch((err) => console.log(err));
  }, [props, currPage]);

  /* Fetch comments triggered by page open and comment interaction (edit/post/delete) */
  React.useEffect(() => {
    fetchComments();
    setCommentInteraction(false);
  }, [fetchComments, hasInteractedComment]);

  return (
    <>
      <Stack spacing={4} sx={{ mx: 8, my: 2 }}>
        <Stack spacing={2}>
          <Typography variant='h5'>Comments</Typography>
          <TextField
            variant='filled'
            placeholder='Write a comment (Between 10-250 characters)'
            size='small'
            value={commentInput}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            inputProps={{ maxLength: 250 }}
          ></TextField>
          <Button
            onClick={submitHandler}
            disabled={commentInput.length < 10 || commentInput.length > 250}
            variant='contained'
          >
            Add Comment
          </Button>
        </Stack>
        <Stack spacing={1}>
          {recentComments.map((data) => (
            <PostComment
              key={data.id}
              data={data}
              userAuthoredComment={props.currentUser.id === data.User.id}
              setHasInteracted={setCommentInteraction}
            />
          ))}
        </Stack>
        <Pagination
          count={totalPages}
          page={currPage}
          onChange={(event: React.ChangeEvent<unknown>, pg: number) => {
            setPage(pg);
            setCommentInteraction(true);
          }}
          data-testid='test-paginate'
          color='primary'
          variant='outlined'
          sx={{ display: 'flex', justifyContent: 'center' }}
        />
      </Stack>
    </>
  );
}

/* Post settings, choosing between deleting, editing or reporting a post. The delete
  and edit options are only shown if the user is authorized. */
function MoreOptions(props: {
  postID: string;
  userHasCreatedPost: boolean;
  toggleEdit: React.Dispatch<React.SetStateAction<boolean>>;
  useNavigate: NavigateFunction;
  didUserReport: string;
}) {
  const [isOpen, toggleMenu] = React.useState(false);
  const [isAlertOpen, showAlert] = React.useState(false);
  const [alertMsg, setMsg] = React.useState('An error has occurred');

  const closeMenu = () => {
    toggleMenu(false);
  };

  const deletePost = () => {
    api
      .deletePost(props.postID)
      .then((res) => {
        if (res.status === 204) {
          props.useNavigate(-1);
        }
      })
      .catch((err) => {
        setMsg('Failed to delete post');
        showAlert(true);
        console.error(err);
      });

    closeMenu();
  };

  const reportPost = () => {
    api
      .reportPost(props.postID)
      .then((res) => {
        props.didUserReport = '1';
        if (res.status === 204) {
          setMsg('Post has been reported.');
        } else if (res.status === 200) {
          setMsg('Post has been reported and deleted.');
        } else {
          setMsg('Failed to report post.');
          props.didUserReport = '0';
        }
      })
      .catch(() => {
        setMsg('Failed to report post.');
      })
      .finally(() => {
        showAlert(true);
      });
  };

  return (
    <>
      <IconButton
        id='post-settings'
        data-testid='test-post-settings'
        color='inherit'
        aria-controls='settings-menu'
        aria-haspopup='true'
        aria-expanded={isOpen}
        onClick={() => {
          toggleMenu(true);
        }}
      >
        <MoreVert />
      </IconButton>
      <Menu
        id='post-settings-menu'
        data-testid='test-post-settings-menu'
        anchorEl={document.getElementById('post-settings')}
        open={isOpen}
        onClose={closeMenu}
        MenuListProps={{
          'aria-labelledby': 'post-settings',
          style: { minWidth: '110px' },
        }}
      >
        {props.userHasCreatedPost ? (
          <>
            <MenuItem onClick={() => props.toggleEdit(true)}>Edit</MenuItem>
            <MenuItem onClick={deletePost}>Delete</MenuItem>
          </>
        ) : (
          <></>
        )}
        {!props.userHasCreatedPost ? (
          props.didUserReport === '0' ? (
            <MenuItem onClick={reportPost}>Report</MenuItem>
          ) : (
            <MenuItem disabled>Reported</MenuItem>
          )
        ) : undefined}
      </Menu>
      <Snackbar
        open={isAlertOpen}
        autoHideDuration={6000}
        onClose={() => showAlert(false)}
        message={alertMsg}
      />
    </>
  );
}

/* Like button. Handles liking/unliking a post */
function LikeButton(props: {
  setInteractionBit: React.Dispatch<React.SetStateAction<boolean>>;
  numLikes: number;
  doesUserLike: string;
  id: string;
}) {
  let numLikes = !isNaN(props.numLikes) ? props.numLikes : 0;
  const isLiked = props.doesUserLike === '1';

  const handleClick = async () => {
    if (!isLiked) {
      await api.likePost(props.id);
    } else {
      await api.unlikePost(props.id);
    }
    props.setInteractionBit((bit) => !bit);
  };

  const likeButton = isLiked ? (
    <ThumbUpIcon
      onClick={handleClick}
      fontSize='large'
      style={{
        cursor: 'pointer',
      }}
    />
  ) : (
    <ThumbUpOffAltIcon
      onClick={handleClick}
      fontSize='large'
      style={{
        cursor: 'pointer',
      }}
    />
  );

  return (
    <Stack direction='row'>
      {likeButton}
      <Typography sx={{ pt: 0.5, px: 1, pl: 1 }}>{numLikes}</Typography>
    </Stack>
  );
}

function CapacityBar(props: {
  type: string;
  setInteractionBit: React.Dispatch<React.SetStateAction<boolean>>;
  maxCapacity: number;
  postID: string;
  isUserCheckedIn: string;
  usersCheckedIn: number;
}) {
  const maxCapacity = !isNaN(props.maxCapacity) ? props.maxCapacity : 0;

  const handleCheckIn = async () => {
    if (props.isUserCheckedIn === '1') {
      await api.checkout(props.postID);
    } else {
      const result = await api.checkin(props.postID);
      if (result.status === 409) {
        // TODO indicate a standard alert to the user that the event could not be
        // checked into (over capacity)
      }
    }
    props.setInteractionBit((bit) => !bit);
  };

  const buttonHandler =
    props.isUserCheckedIn === '1' ? (
      <Button onClick={handleCheckIn} variant='contained'>
        Undo
      </Button>
    ) : props.usersCheckedIn < props.maxCapacity ? (
      <Button onClick={handleCheckIn} variant='outlined'>
        {typeButtonLabels[props.type]}
      </Button>
    ) : (
      <Button disabled variant='outlined'>
        AT CAPACITY
      </Button>
    );

  return (
    <Stack spacing={1} sx={{ mr: 4 }}>
      <Typography variant='body1' sx={{ pr: 2 }}>
        {typeLabels[props.type]}: {props.usersCheckedIn}/{maxCapacity}
      </Typography>
      <LinearProgress
        variant='determinate'
        value={(props.usersCheckedIn * 100) / maxCapacity}
      ></LinearProgress>
      {buttonHandler}
    </Stack>
  );
}

function PostEditor(props: {
  type: string;
  id: string;
  title: string;
  body: string;
  location: string;
  coords?: { lat: number; lng: number };
  capacity: number;
  toggleEdit: () => void;
}) {
  const isOnlineInitially = // indicate if prior to editing we are online
    !props.coords || props.coords.lat === -1 || props.coords.lng === -1;
  const [form, setForm] = React.useState({
    title: props.title,
    body: props.body,
    capacity: props.capacity,
    location: props.location,
    coords: props.coords,
  });
  const [location, setLocation] = React.useState({
    location: props.location,
    coords: props.coords ? props.coords : { lat: -1, lng: -1 },
  });

  const [alertMsg, setMsg] = React.useState(
    'Error. Ensure all fields are filled'
  );
  const [capacityError, setCapacityError] = React.useState('');
  const [isAlertOpen, showAlert] = React.useState(false);
  const [isOnlineEvent, toggleOnlineEvent] = React.useState(isOnlineInitially);

  const locationHandler = (
    location: string,
    lat: number = -1,
    lng: number = -1
  ) => {
    setLocation({ location, coords: { lat, lng } });
  };

  React.useEffect(() => {
    setForm((form) => {
      return {
        ...form,
        location: location.location,
        coords: { lat: location.coords.lat, lng: location.coords.lng },
      };
    });
  }, [location]);

  const handleSubmit = () => {
    if (form.body.length < 25) {
      setMsg('Body must be atleast 25 characters');
      showAlert(true);
    } else if (
      form.title === '' ||
      (props.type === 'Events' && form.location === '')
    ) {
      setMsg('Enter all required fields');
      showAlert(true);
    } else if (isNaN(form.capacity)) {
      setMsg('Capacity must be a number');
      showAlert(true);
    } else {
      api.updatePost(props.id, form);
      props.toggleEdit();
    }
  };

  return (
    <>
      <AppBar sx={{ position: 'relative' }}>
        <IconButton
          data-testid='test-btn-edit-close'
          edge='start'
          color='inherit'
          onClick={props.toggleEdit}
          aria-label='close'
        >
          <ArrowBack />
        </IconButton>
      </AppBar>

      <Stack sx={{ pt: 5, pl: 4, px: 4 }}>
        <Typography> Title </Typography>
        <TextField
          fullWidth
          defaultValue={props.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Stack>

      <Stack
        display={props.type === 'Events' ? undefined : 'none'}
        sx={{ pl: 4, pt: 3, pb: 3, px: 4 }}
      >
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={isOnlineEvent}
                onChange={(e) => {
                  toggleOnlineEvent(e.target.checked);
                  locationHandler('');
                }}
              />
            }
            label='Online Event'
          />
        </FormGroup>
        <Typography> Location </Typography>
        {!isOnlineEvent ? (
          <LocationPickerMap
            defaultInput={!isOnlineInitially ? props.location : undefined}
            defaultCenter={!isOnlineInitially ? props.coords : undefined}
            setLocation={locationHandler}
          />
        ) : (
          <TextField
            size='small'
            defaultValue={isOnlineInitially ? props.location : ''}
            onChange={(e) => locationHandler(e.target.value)}
          />
        )}
      </Stack>
      <Stack sx={{ pl: 4, px: 4 }}>
        <Typography> Body </Typography>
        <TextField
          defaultValue={props.body}
          fullWidth
          multiline
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <Stack sx={{ pt: 2, pb: 2 }}>
          <Typography>{typeLabels[props.type]}</Typography>
          <TextField
            size='small'
            defaultValue={props.capacity}
            onChange={(e) =>
              setForm({ ...form, capacity: Number(e.target.value) })
            }
            onBlur={() => {
              if (!/^[0-9]*$/.test(form.capacity.toString())) {
                setCapacityError('Only numbers allowed!');
              } else {
                setCapacityError('');
              }
            }}
            error={capacityError !== ''}
            helperText={capacityError}
          />
        </Stack>

        <Stack direction='row' sx={{ pt: 1, pb: 1 }}>
          <Button
            data-testid='test-btn-edit'
            variant='contained'
            onClick={handleSubmit}
            sx={{ mr: 2 }}
          >
            Update Post
          </Button>

          <Button
            data-testid='test-btn-edit'
            variant='contained'
            color='secondary'
            onClick={() => props.toggleEdit()}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
      <Snackbar
        open={isAlertOpen}
        autoHideDuration={6000}
        onClose={() => showAlert(false)}
        message={alertMsg}
      />
    </>
  );
}

function LocationHandler(props: {
  coords?: { lat: number; lng: number };
  location: string;
}) {
  const [isMapVisible, toggleMap] = React.useState(true);
  const isOfflineEvent =
    props.coords && props.coords.lat !== -1 && props.coords.lng !== -1; // disable google maps with invalid coords

  return (
    <Box sx={{ pl: 4, pb: 1 }}>
      <Typography variant='body2' sx={{ pt: 2 }}>
        Location: {props.location}
        {isOfflineEvent && (
          <Switch
            checked={isMapVisible}
            onChange={() => toggleMap((prev) => !prev)}
            size='medium'
          />
        )}
      </Typography>
      {/* Show google maps on valid coordinates */}
      {isOfflineEvent && (
        <LocationMap
          visible={isMapVisible}
          location={props.location}
          lat={props.coords!.lat}
          lng={props.coords!.lng}
        />
      )}
    </Box>
  );
}

/* Opens a full screen dialog containing a post. */
export default function ViewPostDialog() {
  const [postData, setData] = React.useState({} as PostUser);
  const [isAuthor, setIsAuthor] = React.useState(false);
  const [isEditing, toggleEditor] = React.useState(false);
  const userContext = React.useContext(UserContext);
  const { postid } = useParams();
  const navigate = useNavigate();
  const [error, toggleError] = React.useState(false);
  const [interactionBit, setInteractionBit] = React.useState(false);

  /* Need to fetch the rest of the post data (or update it incase the post has changed) */
  const fetchData = React.useCallback(() => {
    if (error || isEditing) {
      return;
    }

    api
      .fetchPost(postid!)
      .then((res) => {
        if (res.data && res.data.data && res.data.data.result) {
          setData(res.data.data.result);
          if (userContext.data) {
            setIsAuthor(userContext.data.id === res.data.data.result.UserId);
            toggleError(false);
          }
        } else {
          toggleError(true);
        }
      })
      .catch((err) => {
        console.error(`Error fetching post ${err}`);
        toggleError(true);
      });
  }, [postid, userContext.data, error, isEditing]);

  /* Fetch post changes by polling */
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  });

  /* Update on interaction */
  React.useEffect(() => {
    fetchData();
  }, [fetchData, interactionBit]);

  if (error) {
    window.location.replace('/404');
    return <></>;
  } else if (!postData || !postData.User) {
    return (
      <>
        <Typography variant='h4'>Loading</Typography>
      </>
    );
  }

  return (
    <>
      {isEditing ? ( // show the editing UI instead of normal post
        <PostEditor
          type={postData.type}
          id={postData.id}
          title={postData.title}
          body={postData.body}
          location={postData.location}
          capacity={Number(postData.capacity)}
          coords={postData.coords}
          toggleEdit={() => toggleEditor(false)}
        />
      ) : (
        <>
          <AppBar sx={{ position: 'relative' }}>
            <IconButton
              data-testid='test-btn-close'
              edge='start'
              color='inherit'
              onClick={() => {
                navigate(-1);
              }}
              aria-label='close'
            >
              <ArrowBack />
            </IconButton>
          </AppBar>

          {/* Title and Options (3 dots) */}
          <Grid>
            <Stack direction='row' sx={{ pt: 5, pl: 4 }}>
              <Grid item xs={11}>
                <Typography variant='h5' style={{ wordWrap: 'break-word' }}>
                  {postData.title}
                </Typography>
              </Grid>
              <MoreOptions
                postID={postData.id}
                userHasCreatedPost={isAuthor}
                didUserReport={postData.didUserReport}
                useNavigate={navigate}
                toggleEdit={toggleEditor}
              />
            </Stack>
          </Grid>
          {/* Top information (author, date, tags..) */}
          <Stack sx={{ pl: 4 }}>
            <Typography variant='subtitle2' sx={{ mb: 1, mt: 0.5 }}>
              {postData.type}
            </Typography>
            <Typography variant='body2' sx={{ mb: 1, mt: 0.5 }}>
              Posted on {new Date(postData.createdAt).toString()} by{' '}
              {postData.User.firstName} {postData.User.lastName}
            </Typography>
            {
              <GenerateTags
                tags={postData.Tags ? postData.Tags.map((t) => t.text) : []}
              />
            }
          </Stack>

          {/* Post image and body */}
          <Stack sx={{ pl: 4 }}>
            <Box
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {!!postData.thumbnail ? (
                <img
                  src={postData.thumbnail}
                  alt='Thumbnail'
                  style={{ maxHeight: '400px', maxWidth: '400px' }}
                />
              ) : undefined}
            </Box>
            <Typography
              variant='body1'
              sx={{ px: 4, py: 1, pb: 4 }}
              style={{ wordWrap: 'break-word' }}
            >
              {postData.body}
            </Typography>
            <Stack direction='row' sx={{ px: 4, pb: 5 }}>
              {Number(postData.capacity) > 0 ? (
                <CapacityBar
                  type={postData.type}
                  setInteractionBit={setInteractionBit}
                  maxCapacity={Number(postData.capacity)}
                  postID={postData.id}
                  isUserCheckedIn={postData.isUserCheckedIn}
                  usersCheckedIn={postData.usersCheckedIn}
                />
              ) : (
                <></>
              )}
              <LikeButton
                setInteractionBit={setInteractionBit}
                numLikes={Number(postData.likeCount)}
                doesUserLike={postData.doesUserLike}
                id={postData.id}
              />
            </Stack>
            {postData.type === 'Events' ? (
              <LocationHandler
                coords={postData.coords}
                location={postData.location}
              />
            ) : (
              <></>
            )}
          </Stack>
          {/* Comment Section */}
          <CommentsHandler
            postID={postData.id}
            currentUser={userContext.data}
          />
        </>
      )}{' '}
    </>
  );
}
