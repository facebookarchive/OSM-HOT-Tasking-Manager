import React from 'react';
import { Link } from '@reach/router';
import { useSelector } from 'react-redux';

import { ProfilePictureIcon, CloseIcon } from '../svgIcons';
import { getRandomArrayItem } from '../../utils/random';
import { useAvatarStyle } from '../../hooks/UseAvatarStyle';
import { useAvatarText } from '../../hooks/UseAvatarText';

export const CurrentUserAvatar = (props) => {
  const userPicture = useSelector((state) => state.auth.userDetails.pictureUrl);
  if (userPicture) {
    return (
      <div
        {...props}
        style={{ backgroundImage: `url(${userPicture})`, backgroundSize: 'cover' }}
        alt={'user avatar'}
      />
    );
  }
  return <ProfilePictureIcon {...props} />;
};

export const UserAvatar = ({
  name,
  username,
  number,
  picture,
  size,
  colorClasses,
  removeFn,
  editMode,
  disableLink = false,
}: Object) => {
  const avatarText = useAvatarText(name, username, number);

  if ((removeFn && editMode) || disableLink) {
    return (
      <Avatar
        text={avatarText}
        username={username}
        picture={picture}
        size={size}
        colorClasses={colorClasses}
        removeFn={removeFn}
        editMode={editMode}
      />
    );
  } else {
    return (
      <Link to={`/users/${username}`}>
        <Avatar
          text={avatarText}
          username={username}
          picture={picture}
          size={size}
          colorClasses={colorClasses}
          removeFn={removeFn}
          editMode={editMode}
        />
      </Link>
    );
  }
};

const Avatar = ({ username, size, colorClasses, removeFn, picture, text, editMode }) => {
  const { sizeClasses, textPadding, closeIconStyle, sizeStyle } = useAvatarStyle(
    size,
    editMode,
    picture,
  );

  return (
    <div
      title={username}
      style={sizeStyle}
      className={`dib mh1 br-100 tc v-mid cover ${colorClasses} ${sizeClasses}`}
    >
      {removeFn && editMode && (
        <div
          className="relative top-0 z-1 fr br-100 f7 tc h1 w1 bg-primary white pointer"
          style={closeIconStyle}
          onClick={() => removeFn(username)}
        >
          <CloseIcon className="pt1" />
        </div>
      )}
      {!picture && (
        <span className="relative tc w-100 dib ttu dib barlow-condensed v-mid" style={textPadding}>
          {text}
        </span>
      )}
    </div>
  );
};

export const UserAvatarList = ({
  users,
  maxLength,
  textColor = 'white',
  bgColor,
  size,
}: Object) => {
  const getColor = () =>
    bgColor ? bgColor : getRandomArrayItem(['bg-orange', 'bg-primary', 'bg-blue-dark', 'bg-blue-grey']);
  let marginLeft = '-1.25rem';
  if (size === 'large') {
    marginLeft = '-1.5rem';
  }
  if (size === 'small') {
    marginLeft = '-0.875rem';
  }

  return (
    <>
      {users.slice(0, maxLength ? maxLength : users.length).map((user, n) => (
        <div style={{ marginLeft: n === 0 ? '' : marginLeft }} className="dib" key={n}>
          <UserAvatar
            username={user.username}
            picture={user.pictureUrl}
            size={size}
            colorClasses={`${textColor} ${getColor()}`}
          />
        </div>
      ))}
      {maxLength && users.length - maxLength > 0 && (
        <div style={{ marginLeft: '-1.5rem' }} className="dib">
          <UserAvatar
            number={`+${users.length - maxLength > 999 ? 999 : users.length - maxLength}`}
            size={size}
            colorClasses={`blue-dark bg-grey-light`}
            disableLink={true}
          />
        </div>
      )}
    </>
  );
};
