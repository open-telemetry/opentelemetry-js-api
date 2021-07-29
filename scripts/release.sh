#!/usr/bin/env bash

set -e

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    -h|--help)
      HELP=YES
      shift # past argument
      ;;
    -d|--dry-run)
      DRY=YES
      shift
      ;;
    -f|--force)
      FORCE=YES
      shift
      ;;
    -c|--no-clean)
      NOCLEAN=YES
      shift
      ;;
    -l|--no-latest)
      LATEST=YES
      shift
      ;;
    -t|--tag)
      TAG="$2"
      shift # past argument
      shift # past value
      ;;
    *)    # unknown option
      POSITIONAL+=("$1") # save it in an array for later
      shift # past argument
      ;;
  esac
done

if [ -z "$TAG" ]; then
  TAG="next"
fi

if [ -n "$HELP" ]; then
  echo "release.sh Usage:"
  echo ""
  echo "ALWAYS RUN FROM THE ROOT OF THE REPOSITORY"
  echo ""
  echo "Arguments:"
  echo -e "\t-h | --help"
  echo -e "\t\tDisplay this help message"
  echo ""
  echo -e "\t-d | --dry"
  echo -e "\t\tPerform a dry run"
  echo ""
  echo -e "\t-f | --force"
  echo -e "\t\tForce execution even if there are uncommitted changes in the workspace"
  echo ""
  echo -e "\t-c | --no-clean"
  echo -e "\t\tDo not clean the workspace"
  echo ""
  echo -e "\t-l | --latest"
  echo -e "\t\tApply the NPM dist-tag @latest after publish"
  echo ""
  echo -e "\t-t | --tag next"
  echo -e "\t\tWhich NPM dist-tag to apply to the release. Default: next"

  exit 0
fi

if [ ! -d ".git" ]; then
  echo "Not in a git repository"
  exit 1
fi

if changes=$(git status --porcelain) && [ -n "$changes" ] && [ -z "$FORCE" ]; then
  echo "There are uncommitted changes in the workspace"
  echo $changes
  exit 1
fi

[ -n "$DRY" ] && echo "Dry run"

# Ensure working directory is clean if user has not specifically disabled cleaning
if [ -z "$NOCLEAN" ]; then
  echo "Cleaning workspace"
  echo "rm -rf node_modules"
  [ -z "$DRY" ] && rm -rf node_modules
  echo "rm -f package-lock.json"
  [ -z "$DRY" ] && rm -f package-lock.json
  echo "git clean -fdx"
  [ -z "$DRY" ] && git clean -fdx
else
  echo "Skipping cleaning directory"
fi

echo "npm install"
[ -z "$DRY" ] && npm install

echo "npm compile"
[ -z "$DRY" ] && npm compile

echo "npm test"
[ -z "$DRY" ] && npm test

echo "npm publish --tag $TAG"
[ -z "$DRY" ] && npm publish --tag $TAG

echo "npm dist-tag add \"@opentelemetry/api@$TAG\" latest"
if [ -n "$LATEST" ]; then
  [ -z "$DRY" ] && npm dist-tag add "@opentelemetry/api@$TAG" latest
fi

exit 0
