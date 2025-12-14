import { TiMessage } from "react-icons/ti";
import { IoEyeOutline } from "react-icons/io5";
import { FaPenToSquare } from "react-icons/fa6";

interface AcctionButtonProps {
  // className, onClick, ...
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  iconSize?: number;
}

export const Chat = (props: AcctionButtonProps) => {
  return (
    <div className={props.className} onClick={props.onClick}>
      <TiMessage size={props.iconSize} />
    </div>
  );
};

export const View = (props: AcctionButtonProps) => {
  return (
    <div className={props.className} onClick={props.onClick}>
      <IoEyeOutline size={props.iconSize} />
    </div>
  );
};

export const Edit = (props: AcctionButtonProps) => {
  return (
    <div className={props.className} onClick={props.onClick}>
      <FaPenToSquare size={props.iconSize} />
    </div>
  );
};
