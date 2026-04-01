namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Timers;

    using Loupedeck.Service;

    public abstract class ExecuteBaseActionCommand : ActionEditorCommand
    {
        private const String ActionNameControlName = "actionName";
        private const String ActionTypeControlName = "actionType";
        private const String ActionRateControlName = "actionRate";

        private readonly ConcurrentDictionaryNoCase<TaggedTimer> _timers = new();

        public ExecuteBaseActionCommand()
        {
            this.GroupName = "Advanced";
            this.Description = "IMPORTANT: Action name list contains actions that are already assigned to any control.";

            this.ActionEditor.AddControlEx(new ActionEditorListbox(name: ActionNameControlName, labelText: "Action name:"));
            this.ActionEditor.AddControlEx(new ActionEditorListbox(name: ActionTypeControlName, labelText: "Action type:"));
            this.ActionEditor.AddControlEx(new ActionEditorListbox(name: ActionRateControlName, labelText: "Action rate:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override Boolean OnUnload()
        {
            foreach (var timer in this._timers.Values)
            {
                timer.Stop();
                timer.Dispose();
            }

            this._timers.Clear();

            return true;
        }

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            if (actionParameters.TryGetString(ActionNameControlName, out var actionName) && !String.IsNullOrEmpty(actionName))
            {
                if (this._timers.TryGetValue(actionName, out var timer))
                {
                    timer.Stop();
                    timer.Dispose();

                    this._timers.Remove(actionName);
                    return true;
                }
                else if (actionParameters.TryGetInt32(ActionRateControlName, out var actionRate) && actionParameters.TryGetInt32(ActionTypeControlName, out var actionType))
                {
                    timer = new TaggedTimer(actionRate);
                    timer.AutoReset = true;
                    timer.Elapsed += this.OnTimerElapsed;
                    timer.Tag = new ActionInfo(actionName, actionType, this.GetActionCount(actionParameters, actionRate));

                    this._timers[actionName] = timer;

                    timer.Start();
                    return true;
                }
            }

            return false;
        }

        protected abstract Int32 GetActionCount(ActionEditorActionParameters actionParameters, Int32 actionRate);

        private void OnTimerElapsed(Object sender, ElapsedEventArgs e)
        {
            if ((sender is TaggedTimer timer) && (timer.Tag is ActionInfo actionInfo))
            {
                timer.Stop();

                if (actionInfo.ActionCount >= 0)
                {
                    actionInfo.ActionCount--;

                    if (actionInfo.ActionCount < 0)
                    {
                        timer.Dispose();
                        this._timers.Remove(actionInfo.ActionName);
                        return;
                    }
                }

                Test4Plugin.LoupedeckService.ActionExecutor.ExecuteAction(actionInfo.ActionString, actionInfo.ActionType);

                timer.Start();
            }
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            var controlValue = e.ActionEditorState.GetControlValue(e.ControlName);
            if (0 == controlValue?.Length)
            {
                controlValue = null;
            }

            if (e.ControlName.EqualsNoCase(ActionNameControlName))
            {
                var state = Test4Plugin.LoupedeckService.ConfigurationWindow.LastState;
                if ((state != null) && Test4Plugin.LoupedeckService.ProfileManager.TryGetApplicationProfile(state.DeviceType, state.ApplicationName, state.ProfileName, out var applicationProfile))
                {
                    var actions = new Dictionary<String, String>();

                    applicationProfile.Layout.ForEachAssignedAction(AddAssignedAction);

                    Boolean AddAssignedAction(String actionName, out String newActionName)
                    {
                        if (!String.IsNullOrEmpty(actionName))
                        {
                            var actionDisplayName = ApplicationProfileImages.GetActionDisplayName(Test4Plugin.LoupedeckService, applicationProfile, actionName, PluginImageSize.None, actionName);
                            actions[actionDisplayName] = actionName;
                        }

                        newActionName = null;
                        return false;
                    }

                    actions.Sort();

                    foreach (var pair in actions)
                    {
                        e.AddItem(pair.Value, pair.Key, description: null);
                    }
                }

                e.SetSelectedItemName(controlValue ?? String.Empty);
            }
            else if (e.ControlName.EqualsNoCase(ActionTypeControlName))
            {
                e.AddItem(name: "0", displayName: "Command", description: null);
                e.AddItem(name: "1", displayName: "Adjustment (clockwise)", description: null);
                e.AddItem(name: "-1", displayName: "Adjustment (counterclockwise)", description: null);

                e.SetSelectedItemName(controlValue ?? "0");
            }
            else if (e.ControlName.EqualsNoCase(ActionRateControlName))
            {
                AddActionRate(1);
                AddActionRate(10);
                AddActionRate(25);
                AddActionRate(50);
                AddActionRate(75);
                AddActionRate(100);
                AddActionRate(250);
                AddActionRate(500);
                AddActionRate(750);
                AddActionRate(1_000);
                AddActionRate(2_500);
                AddActionRate(5_000);
                AddActionRate(7_500);
                AddActionRate(10_000);

                e.SetSelectedItemName(controlValue ?? "500");

                void AddActionRate(Int32 actionRate) => e.AddItem(name: $"{actionRate}", displayName: $"Every {actionRate:N0} ms", description: null);
            }
            else
            {
                this.OnActionEditorListboxItemsRequested(e, controlValue);
            }
        }

        protected abstract void OnActionEditorListboxItemsRequested(ActionEditorListboxItemsRequestedEventArgs e, String controlValue);

        private class ActionInfo
        {
            public String ActionName { get; }

            public ActionString ActionString { get; }

            public Int32 ActionType { get; }

            public Int32 ActionCount { get; set; }

            public ActionInfo(String actionName, Int32 actionType, Int32 actionCount)
            {
                this.ActionName = actionName;
                this.ActionString = new ActionString(actionName);
                this.ActionType = actionType;
                this.ActionCount = actionCount;
            }
        }
    }
}