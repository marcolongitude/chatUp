package store

import "errors"

var (
	ErrInvalidFamilyPair   = errors.New("invalid family pair")
	ErrFamilyNotAcceptable = errors.New("family link not acceptable")
	ErrFamilyNotFound      = errors.New("family link not found")
	ErrFamilyNotAccepted   = errors.New("family link not accepted")
	ErrFamilyForbidden     = errors.New("family link forbidden")
)
