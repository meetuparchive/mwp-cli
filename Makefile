CI_BUILD_NUMBER ?= $(USER)-snapshot
VERSION ?= 8.5.$(CI_BUILD_NUMBER)

version:
	@echo $(VERSION)
