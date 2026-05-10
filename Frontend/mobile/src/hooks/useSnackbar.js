import { useSnackbar as useSnackbarContext } from '../context/SnackbarContext';

export const useSnackbar = () => {
  return useSnackbarContext();
};
