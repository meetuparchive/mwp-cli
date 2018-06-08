CI_BUILD_NUMBER ?= $(USER)-snapshot
VERSION ?= 7.2.$(CI_BUILD_NUMBER)

version:
	@echo $(VERSION)
