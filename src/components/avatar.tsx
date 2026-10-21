import type { Avatar as AvatarType } from "@shared/protocol";
const icons:Record<AvatarType,string>={fox:"🦊",cat:"🐱",frog:"🐸",bear:"🐻",bunny:"🐰",panda:"🐼",owl:"🦉",dog:"🐶"};
export function Avatar({value,className=""}:{value:AvatarType;className?:string}){return <span aria-label={value} className={`avatar avatar-${value} ${className}`}>{icons[value]}</span>;}
