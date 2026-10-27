// Kiểu cảm ứng tối thiểu thay cho TouchEvent/Touch của DOM (cùng cách upstream làm ở actions/zoom-image.ts).
// tscompat báo TouchEvent "không hỗ trợ trên Safari 18.5" vì Safari desktop không có thiết bị cảm ứng,
// nhưng các handler dùng kiểu này chỉ chạy khi trình duyệt phát sự kiện touch (iOS Safari hỗ trợ đầy đủ).
export type TouchPoint = {
  clientX: number;
  clientY: number;
};

export type TouchGestureEvent = Pick<Event, 'preventDefault' | 'target'> & {
  touches: ArrayLike<TouchPoint>;
  changedTouches: ArrayLike<TouchPoint>;
};
