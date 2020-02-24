CI_BUILD_NUMBER ?= $(USER)-snapshot
VERSION ?= 13.2.$(CI_BUILD_NUMBER)

version:
	@echo $(VERSION)
